"""AI Neural Engine: Real-ESRGAN super-resolution (+ optional RIFE interpolation).

Designed to run on GitHub Actions CPU runners (no GPU) via Mesa "lavapipe"
software Vulkan, and on any machine with a real Vulkan GPU.

Design goals:
  * REAL detail on zoom  -> Real-ESRGAN neural super-resolution (not just Lanczos).
  * Bulletproof          -> every public method returns True/False and NEVER raises
                            on failure, so the caller can fall back to pure FFmpeg.
  * Disk-safe            -> the source video is split into short time segments and
                            processed one segment at a time; upscaled PNG frames are
                            deleted per segment so peak disk stays small (critical on
                            the ~14 GB GitHub Actions runner).
  * Zero manual setup    -> ncnn-vulkan binaries are auto-downloaded on first use.
"""

import os
import platform
import shutil
import stat
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path
from typing import Optional

# Directory where auto-downloaded binaries live (kept out of git via .gitignore).
BIN_DIR = Path(__file__).resolve().parent / "bin"

# Pinned upstream ncnn-vulkan release assets (stable, self-contained: binary + models).
_REALESRGAN_ASSETS = {
    "Linux": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip",
    "Windows": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip",
    "Darwin": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-macos.zip",
}
_RIFE_ASSETS = {
    "Linux": "https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-ubuntu.zip",
    "Windows": "https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-windows.zip",
    "Darwin": "https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-macos.zip",
}

_EXE = ".exe" if platform.system() == "Windows" else ""


def _log(msg: str) -> None:
    print(f"[AI] {msg}", flush=True)


def _download_and_extract(url: str, dest_dir: Path) -> bool:
    """Download a zip and flatten-extract it into dest_dir. Returns success."""
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
        zip_path = dest_dir / "_dl.zip"
        _log(f"Downloading AI binary: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as resp, open(zip_path, "wb") as f:
            shutil.copyfileobj(resp, f)
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(dest_dir)
        zip_path.unlink(missing_ok=True)
        return True
    except Exception as e:  # noqa: BLE001 - never let a download crash the run
        _log(f"Download/extract failed: {e}")
        return False


def _find_binary(root: Path, stem: str) -> Optional[Path]:
    """Locate an executable named `stem` anywhere under root (releases nest folders)."""
    target = stem + _EXE
    for p in root.rglob(target):
        if p.is_file():
            try:
                p.chmod(p.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
            except Exception:
                pass
            return p
    return None


class AINeuralEngine:
    """Real-ESRGAN super-resolution + optional RIFE frame interpolation."""

    def __init__(self, auto_download: bool = True):
        self.auto_download = auto_download
        # Real-ESRGAN (super-resolution) is the primary engine — resolve it eagerly.
        self.realesrgan_bin = self._resolve("realesrgan-ncnn-vulkan", _REALESRGAN_ASSETS)
        # RIFE (interpolation) is optional and not used by the default FPS path, so it
        # is resolved lazily via `_ensure_rife()` to avoid an unnecessary CI download.
        self._rife_bin = None
        self._rife_resolved = False

    @property
    def rife_bin(self):
        return self._ensure_rife()

    def _ensure_rife(self):
        if not self._rife_resolved:
            self._rife_bin = self._resolve("rife-ncnn-vulkan", _RIFE_ASSETS)
            self._rife_resolved = True
        return self._rife_bin

    # ------------------------------------------------------------------ setup
    def _resolve(self, stem: str, assets: dict) -> Optional[Path]:
        # 1. Already on PATH?
        on_path = shutil.which(stem)
        if on_path:
            return Path(on_path)
        # 2. Already downloaded locally?
        sub = BIN_DIR / stem
        found = _find_binary(sub, stem)
        if found:
            return found
        # 3. Auto-download for this OS.
        if not self.auto_download:
            return None
        url = assets.get(platform.system())
        if not url:
            _log(f"No prebuilt {stem} for platform {platform.system()}.")
            return None
        if _download_and_extract(url, sub):
            return _find_binary(sub, stem)
        return None

    def upscale_available(self) -> bool:
        return self.realesrgan_bin is not None

    def rife_available(self) -> bool:
        return self.rife_bin is not None

    def self_test(self) -> bool:
        """Actually super-resolve one tiny image to confirm a working Vulkan device.

        Running `-h` is not enough: it never calls vkCreateInstance, so it passes even
        on machines where real processing dies with "invalid gpu device". Here we do a
        real 1-frame upscale and require a non-empty output — the honest check that
        decides whether to use AI or fall back to FFmpeg.
        """
        if not self.realesrgan_bin:
            return False
        import tempfile
        try:
            with tempfile.TemporaryDirectory() as td:
                src = Path(td) / "t.png"
                dst = Path(td) / "t_out.png"
                # Tiny 32x32 test image via ffmpeg (already a hard dependency).
                mk = subprocess.run(
                    ["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=gray:s=32x32",
                     "-frames:v", "1", str(src)],
                    capture_output=True, text=True, timeout=60,
                )
                if mk.returncode != 0 or not src.exists():
                    return False
                res = subprocess.run(
                    [str(self.realesrgan_bin), "-i", str(src), "-o", str(dst),
                     "-n", "realesrgan-x4plus", "-s", "4", "-f", "png"],
                    capture_output=True, text=True, timeout=120,
                )
                ok = dst.exists() and dst.stat().st_size > 0
                if not ok:
                    blob = (res.stdout + res.stderr).strip().splitlines()
                    _log(f"Vulkan/GPU self-test failed: {blob[-1] if blob else 'no output'}")
                return ok
        except Exception as e:  # noqa: BLE001
            _log(f"Self-test failed: {e}")
            return False

    # -------------------------------------------------------------- internals
    @staticmethod
    def _run(cmd, timeout: Optional[int] = None) -> bool:
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=timeout)
            return True
        except Exception as e:  # noqa: BLE001
            tail = getattr(e, "stderr", "") or ""
            _log(f"Command failed ({' '.join(map(str, cmd[:2]))} ...): {str(e)[:200]} {tail[-300:]}")
            return False

    def _upscale_frames_dir(self, in_dir: Path, out_dir: Path, model: str, scale: int, tile: int) -> bool:
        out_dir.mkdir(parents=True, exist_ok=True)
        cmd = [
            str(self.realesrgan_bin),
            "-i", str(in_dir),
            "-o", str(out_dir),
            "-n", model,
            "-s", str(scale),
            "-f", "png",
        ]
        if tile > 0:
            cmd += ["-t", str(tile)]  # tile size caps RAM/VRAM (vital on software Vulkan)
        return self._run(cmd)

    # ------------------------------------------------------------------ public
    def upscale_video(
        self,
        input_video: str,
        output_video: str,
        source_fps: float,
        model: str = "realesrgan-x4plus",
        scale: int = 4,
        segment_seconds: int = 2,
        tile: int = 128,
    ) -> bool:
        """Super-resolve a whole video, one short time-segment at a time (disk-safe).

        Produces an intermediate video at `source_fps` and the model's native scale
        (e.g. 4x). Colour grading / exact-resolution scaling / FPS interpolation are
        applied afterwards by the FFmpeg filtergraph stage. Returns False on any
        failure so the caller can fall back to the pure-FFmpeg path.
        """
        if not self.realesrgan_bin:
            _log("Real-ESRGAN binary unavailable; falling back to FFmpeg upscaling.")
            return False

        input_video = str(input_video)
        output_video = str(output_video)
        work = Path(output_video).parent / "_ai_work"
        seg_dir = work / "segments"
        up_dir = work / "upscaled_segments"
        try:
            if work.exists():
                shutil.rmtree(work, ignore_errors=True)
            seg_dir.mkdir(parents=True, exist_ok=True)
            up_dir.mkdir(parents=True, exist_ok=True)

            # 1. Split source into short segments so we never hold the whole 4K
            #    frame set on disk at once.
            _log(f"Splitting source into {segment_seconds}s segments...")
            if not self._run([
                "ffmpeg", "-y", "-i", input_video,
                "-c", "copy", "-map", "0:v:0",
                "-f", "segment", "-segment_time", str(segment_seconds),
                "-reset_timestamps", "1",
                str(seg_dir / "seg_%04d.mp4"),
            ]):
                return False

            segments = sorted(seg_dir.glob("seg_*.mp4"))
            if not segments:
                _log("No segments produced.")
                return False
            _log(f"{len(segments)} segment(s) to super-resolve with {model} x{scale}.")

            concat_list = work / "concat.txt"
            with open(concat_list, "w", encoding="utf-8") as cl:
                for idx, seg in enumerate(segments):
                    frames_in = work / f"fin_{idx:04d}"
                    frames_out = work / f"fout_{idx:04d}"
                    frames_in.mkdir(exist_ok=True)

                    # Extract this segment's frames (source resolution -> small PNGs).
                    if not self._run([
                        "ffmpeg", "-y", "-i", str(seg),
                        "-qscale:v", "1", "-qmin", "1",
                        str(frames_in / "%08d.png"),
                    ]):
                        return False

                    _log(f"  [{idx + 1}/{len(segments)}] Real-ESRGAN super-resolution...")
                    if not self._upscale_frames_dir(frames_in, frames_out, model, scale, tile):
                        return False

                    # Re-encode this segment's upscaled frames at the SOURCE fps.
                    up_seg = up_dir / f"up_{idx:04d}.mp4"
                    if not self._run([
                        "ffmpeg", "-y",
                        "-framerate", f"{source_fps:.6f}",
                        "-i", str(frames_out / "%08d.png"),
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "10",
                        "-pix_fmt", "yuv420p",
                        str(up_seg),
                    ]):
                        return False

                    cl.write(f"file '{up_seg.resolve().as_posix()}'\n")
                    # Free disk immediately.
                    shutil.rmtree(frames_in, ignore_errors=True)
                    shutil.rmtree(frames_out, ignore_errors=True)

            # 2. Concatenate upscaled segments into the intermediate video.
            _log("Concatenating super-resolved segments...")
            if not self._run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat_list),
                "-c", "copy", output_video,
            ]):
                return False

            ok = os.path.exists(output_video) and os.path.getsize(output_video) > 0
            if ok:
                _log(f"AI super-resolution done -> {output_video}")
            return ok
        except Exception as e:  # noqa: BLE001
            _log(f"upscale_video failed: {e}")
            return False
        finally:
            shutil.rmtree(work, ignore_errors=True)
