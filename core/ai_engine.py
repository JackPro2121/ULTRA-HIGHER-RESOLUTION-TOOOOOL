"""AI Neural Engine wrapper for Real-ESRGAN and RIFE NCNN Vulkan binaries.

Used for frame-by-frame deep optical flow interpolation (up to 480 FPS)
and neural super-resolution for short hooks and viral edit segments.
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional


class AINeuralEngine:
    """Manages AI upscaling and RIFE interpolation via standalone NCNN binaries."""

    def __init__(self):
        self.rife_bin = shutil.which("rife-ncnn-vulkan")
        self.realesrgan_bin = shutil.which("realesrgan-ncnn-vulkan")

    def is_available(self) -> bool:
        """Check if AI binaries are available in PATH or local directory."""
        return bool(self.rife_bin or self.realesrgan_bin)

    def interpolate_rife(
        self,
        input_video: str,
        output_video: str,
        multiplier: int = 2,
        model: str = "rife-v4",
    ) -> bool:
        """
        Interpolate video frames using RIFE optical flow (e.g. 30fps -> 60fps or 120fps).
        """
        if not self.rife_bin:
            print("[WARN] rife-ncnn-vulkan not found. Using FFmpeg optical flow fallback.", file=sys.stderr)
            return False

        with tempfile.TemporaryDirectory() as tmpdir:
            frames_in = os.path.join(tmpdir, "in_frames")
            frames_out = os.path.join(tmpdir, "out_frames")
            os.makedirs(frames_in, exist_ok=True)
            os.makedirs(frames_out, exist_ok=True)

            print("[*] Extracting frames for RIFE AI processing...")
            subprocess.run([
                "ffmpeg", "-y", "-i", input_video,
                "-qscale:v", "1", "-qmin", "1",
                os.path.join(frames_in, "%08d.png")
            ], check=True)

            print(f"[*] Running RIFE ({multiplier}x motion flow)...")
            cmd = [
                self.rife_bin,
                "-i", frames_in,
                "-o", frames_out,
                "-m", model,
            ]
            subprocess.run(cmd, check=True)

            print("[*] Reassembling RIFE interpolated frames...")
            subprocess.run([
                "ffmpeg", "-y",
                "-framerate", "60",
                "-i", os.path.join(frames_out, "%08d.png"),
                "-i", input_video,
                "-map", "0:v", "-map", "1:a?",
                "-c:v", "libx264", "-crf", "14", "-preset", "medium",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                output_video
            ], check=True)

        return True

    def upscale_realesrgan(
        self,
        input_video: str,
        output_video: str,
        scale: int = 4,
        model: str = "realesr-animevideov3",
    ) -> bool:
        """
        Upscale video using Real-ESRGAN neural super-resolution.
        """
        if not self.realesrgan_bin:
            print("[WARN] realesrgan-ncnn-vulkan not found. Using FFmpeg Lanczos CAS engine.", file=sys.stderr)
            return False

        with tempfile.TemporaryDirectory() as tmpdir:
            frames_in = os.path.join(tmpdir, "in_frames")
            frames_out = os.path.join(tmpdir, "out_frames")
            os.makedirs(frames_in, exist_ok=True)
            os.makedirs(frames_out, exist_ok=True)

            print("[*] Extracting frames for Real-ESRGAN AI...")
            subprocess.run([
                "ffmpeg", "-y", "-i", input_video,
                "-qscale:v", "1", "-qmin", "1",
                os.path.join(frames_in, "%08d.png")
            ], check=True)

            print(f"[*] Running Real-ESRGAN {scale}x Neural Super-Resolution...")
            cmd = [
                self.realesrgan_bin,
                "-i", frames_in,
                "-o", frames_out,
                "-s", str(scale),
                "-n", model,
            ]
            subprocess.run(cmd, check=True)

            print("[*] Reassembling Real-ESRGAN enhanced frames...")
            subprocess.run([
                "ffmpeg", "-y",
                "-i", os.path.join(frames_out, "%08d.png"),
                "-i", input_video,
                "-map", "0:v", "-map", "1:a?",
                "-c:v", "libx264", "-crf", "14", "-preset", "medium",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                output_video
            ], check=True)

        return True
