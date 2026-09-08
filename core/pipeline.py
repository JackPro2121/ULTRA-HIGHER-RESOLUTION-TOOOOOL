#!/usr/bin/env python3
"""Main Pipeline Orchestrator for Ultra-High Resolution Viral Video Enhancer."""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from core.presets import get_preset, PRESETS, RESOLUTIONS
from core.filtergraph import build_filtergraph


def check_dependencies() -> None:
    """Check that ffmpeg and ffprobe are installed and accessible."""
    for tool in ["ffmpeg", "ffprobe"]:
        if not shutil.which(tool):
            print(f"[ERROR] Required tool '{tool}' not found in PATH.", file=sys.stderr)
            print("Please install FFmpeg: https://ffmpeg.org/download.html", file=sys.stderr)
            sys.exit(1)


def probe_video(file_path: str) -> Dict[str, Any]:
    """Inspect video file and return resolution, framerate, duration, bitrate, and true display orientation."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,duration,bit_rate,nb_frames,tags:stream_side_data",
        "-show_entries", "format=duration,bit_rate",
        "-of", "json",
        file_path,
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        stream = data.get("streams", [{}])[0]
        fmt = data.get("format", {})
        
        width = int(stream.get("width", 1080))
        height = int(stream.get("height", 1920))
        
        # Check rotation tags (crucial for mobile recordings)
        rotation = 0
        tags = stream.get("tags", {})
        if tags and "rotate" in tags:
            try:
                rotation = abs(int(float(tags["rotate"])))
            except (ValueError, TypeError):
                pass
        for sd in stream.get("side_data_list", []):
            if "rotation" in sd:
                try:
                    rotation = abs(int(float(sd["rotation"])))
                except (ValueError, TypeError):
                    pass

        # If rotated 90 or 270 degrees, display width and height are inverted
        if rotation in (90, 270):
            print(f"[*] Detected mobile rotation tag ({rotation}°). Adjusting display orientation to portrait.")
            width, height = height, width
        
        # Parse framerate fraction e.g. "30000/1001" or "30/1"
        r_fps = stream.get("r_frame_rate", "30/1")
        if "/" in r_fps:
            num, den = map(float, r_fps.split("/"))
            fps = num / den if den != 0 else 30.0
        else:
            fps = float(r_fps)
            
        duration = float(stream.get("duration") or fmt.get("duration") or 0.0)
        bitrate = int(stream.get("bit_rate") or fmt.get("bit_rate") or 0)
        
        return {
            "width": width,
            "height": height,
            "fps": fps,
            "duration": duration,
            "bitrate": bitrate,
            "rotation": rotation,
        }
    except Exception as e:
        print(f"[WARN] Could not probe video thoroughly ({e}). Using defaults.", file=sys.stderr)
        return {"width": 1080, "height": 1920, "fps": 30.0, "duration": 0.0, "bitrate": 0, "rotation": 0}



def download_file_if_url(input_path_or_url: str, dest_dir: str = "inputs") -> str:
    """Download video if given an HTTP/HTTPS URL or Google Drive link."""
    if not (input_path_or_url.startswith("http://") or input_path_or_url.startswith("https://")):
        return input_path_or_url

    os.makedirs(dest_dir, exist_ok=True)
    out_file = os.path.join(dest_dir, "downloaded_input.mp4")
    
    print(f"[*] Downloading input video from URL: {input_path_or_url}")
    
    # Check if Google Drive link
    gdrive_match = re.search(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", input_path_or_url)
    if gdrive_match:
        file_id = gdrive_match.group(1)
        direct_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    else:
        direct_url = input_path_or_url

    import urllib.request
    try:
        # Standard download
        req = urllib.request.Request(
            direct_url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req) as response, open(out_file, "wb") as out_f:
            shutil.copyfileobj(response, out_f)
        print(f"[+] Download complete: {out_file} ({os.path.getsize(out_file) / 1024 / 1024:.2f} MB)")
        return out_file
    except Exception as e:
        print(f"[ERROR] Failed to download video: {e}", file=sys.stderr)
        sys.exit(1)


def generate_comparison_image(original_video: str, enhanced_video: str, output_image: str) -> None:
    """Generate a side-by-side comparison JPEG highlighting Before vs After with aspect ratio preservation."""
    print(f"[*] Generating Before/After comparison snapshot: {output_image}")
    orig_info = probe_video(original_video)
    is_portrait = orig_info["height"] >= orig_info["width"]

    if is_portrait:
        filter_expr = (
            "[0:v]scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v0];"
            "[1:v]scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v1];"
            "[v0][v1]hstack=inputs=2[outv]"
        )
    else:
        filter_expr = (
            "[0:v]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v0];"
            "[1:v]scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v1];"
            "[v0][v1]vstack=inputs=2[outv]"
        )

    cmd = [
        "ffmpeg", "-y",
        "-ss", "00:00:01",
        "-i", original_video,
        "-ss", "00:00:01",
        "-i", enhanced_video,
        "-filter_complex", filter_expr,
        "-map", "[outv]",
        "-update", "1",
        "-vframes", "1",
        output_image
    ]
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        print(f"[+] Comparison image created: {output_image}")
    except Exception as e:
        print(f"[WARN] Failed to generate comparison snapshot ({e}). Skipping.", file=sys.stderr)


def enhance_video(
    input_path: str,
    output_path: str,
    preset_name: str = "viral_tiktok_hdr",
    resolution: str = "4k",
    target_fps: int = 60,
    motion_mode: str = "blend",
    enable_bloom: bool = True,
    cas_override: Optional[float] = None,
    contrast_override: Optional[float] = None,
    saturation_override: Optional[float] = None,
    brightness_override: Optional[float] = None,
    gamma_override: Optional[float] = None,
    denoise_override: Optional[float] = None,
    bitrate_override: Optional[int] = None,
    codec: str = "h264",
    generate_comparison: bool = True,
) -> Dict[str, Any]:
    """Execute the full video enhancement pipeline."""
    check_dependencies()

    local_input = download_file_if_url(input_path)
    if not os.path.exists(local_input):
        print(f"[ERROR] Input video not found: {local_input}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    print("=" * 65)
    print(" 🚀 ULTRA-HIGH RESOLUTION (8K / 60-480 FPS STYLE) ENHANCER")
    print("=" * 65)
    print(f" Input Video : {local_input}")
    print(f" Output Video: {output_path}")

    # Probe Input
    info = probe_video(local_input)
    print(f" Input Specs : {info['width']}x{info['height']} @ {info['fps']:.2f} FPS ({info['duration']:.1f}s)")

    # Load Preset
    preset = get_preset(preset_name)
    print(f" Preset      : {preset['name']}")
    print(f" Target Res  : {resolution.upper()}")
    print(f" Target FPS  : {target_fps} FPS (Mode: {motion_mode})")

    # Use preset codec if not explicitly given or default
    final_codec = codec or preset.get("codec", "h264")
    bitrate_mbps = bitrate_override if bitrate_override is not None else preset.get("bitrate_mbps", 65)
    print(f" Codec       : {final_codec.upper()} Master Bitrate: {bitrate_mbps} Mbps")

    # Build Complex Filtergraph
    filtergraph_str, out_w, out_h = build_filtergraph(
        preset=preset,
        input_width=info["width"],
        input_height=info["height"],
        target_resolution=resolution,
        target_fps=target_fps,
        motion_mode=motion_mode,
        enable_bloom=enable_bloom,
        cas_override=cas_override,
        contrast_override=contrast_override,
        saturation_override=saturation_override,
        brightness_override=brightness_override,
        gamma_override=gamma_override,
        denoise_override=denoise_override,
    )

    # FFmpeg Command Assembly
    cmd = ["ffmpeg", "-y", "-i", local_input, "-filter_complex", filtergraph_str, "-map", "[outv]"]

    # Map original audio if present
    cmd.extend(["-map", "0:a?", "-c:a", "aac", "-b:a", "320k"])

    # Video Codec settings
    if final_codec.lower() in ["h265", "hevc"]:
        cmd.extend([
            "-c:v", "libx265",
            "-preset", "medium",
            "-crf", "14",
            "-b:v", f"{bitrate_mbps}M",
            "-maxrate", f"{int(bitrate_mbps * 1.3)}M",
            "-bufsize", f"{int(bitrate_mbps * 2.0)}M",
            "-tag:v", "hvc1",
        ])
    else:  # libx264 (Maximum mobile/TikTok compatibility)
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "slow",
            "-profile:v", "high",
            "-level:v", "5.2",
            "-crf", "12",
            "-b:v", f"{bitrate_mbps}M",
            "-maxrate", f"{int(bitrate_mbps * 1.3)}M",
            "-bufsize", f"{int(bitrate_mbps * 2.0)}M",
        ])

    # Faststart flag for instant streaming and mobile playback
    cmd.extend(["-movflags", "+faststart", output_path])

    print("\n[*] Running FFmpeg Master Enhancement Pipeline...")
    start_time = time.time()
    
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
        )

        for line in proc.stdout:
            # Print frame progress if available
            line_str = line.strip()
            if "frame=" in line_str or "fps=" in line_str or "time=" in line_str:
                print(f"\r{line_str}", end="", flush=True)
            elif "error" in line_str.lower():
                print(f"\n[FFMPEG] {line_str}", file=sys.stderr)

        proc.wait()
        if proc.returncode != 0:
            raise subprocess.CalledProcessError(proc.returncode, cmd)

    except Exception as e:
        print(f"\n[ERROR] FFmpeg rendering failed: {e}", file=sys.stderr)
        sys.exit(1)

    elapsed = time.time() - start_time
    print(f"\n\n[✓] Enhancement Complete in {elapsed:.1f}s!")
    print(f"[✓] Master Output Saved: {output_path} ({os.path.getsize(output_path) / 1024 / 1024:.2f} MB)")

    # Generate Comparison Image
    if generate_comparison:
        comp_img = os.path.splitext(output_path)[0] + "_comparison.jpg"
        generate_comparison_image(local_input, output_path, comp_img)

    return {
        "output_video": output_path,
        "width": out_w,
        "height": out_h,
        "fps": target_fps,
        "elapsed_seconds": elapsed,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Ultra-High Resolution 8K / 60-480 FPS Viral Video Enhancer"
    )
    parser.add_argument("-i", "--input", required=True, help="Input video file path or direct HTTP/HTTPS URL")
    parser.add_argument("-o", "--output", default="outputs/enhanced_output.mp4", help="Output MP4 file path")
    parser.add_argument(
        "-p", "--preset",
        default="viral_tiktok_hdr",
        choices=list(PRESETS.keys()),
        help="Aesthetic grade preset (default: viral_tiktok_hdr)"
    )
    parser.add_argument(
        "-r", "--resolution",
        default="4k",
        choices=list(RESOLUTIONS.keys()),
        help="Target resolution (1080p, 2k, 4k, 8k, 12k)"
    )
    parser.add_argument(
        "-fps", "--fps",
        type=int,
        default=60,
        help="Target frame rate (30, 60, 120, 240, 480)"
    )
    parser.add_argument(
        "-m", "--motion-mode",
        default="blend",
        choices=["blend", "mci", "framerate"],
        help="Motion smoothing mode: 'blend' (motion-blur flow), 'mci' (optical interpolation), 'framerate' (fast)"
    )
    parser.add_argument("--no-bloom", action="store_true", help="Disable specular highlight bloom")
    parser.add_argument("--sharpness", type=float, default=None, help="Override CAS sharpness strength (0.0 to 1.0)")
    parser.add_argument("--contrast", type=float, default=None, help="Override contrast factor (e.g. 1.15)")
    parser.add_argument("--saturation", type=float, default=None, help="Override saturation factor (e.g. 1.25)")
    parser.add_argument("--brightness", type=float, default=None, help="Override brightness offset (e.g. 0.02)")
    parser.add_argument("--gamma", type=float, default=None, help="Override gamma factor (e.g. 1.05)")
    parser.add_argument("--denoise", type=float, default=None, help="Override denoise strength (e.g. 2.0)")
    parser.add_argument("--bitrate", type=int, default=None, help="Override export bitrate in Mbps (e.g. 80, 120)")
    parser.add_argument("--codec", default="h264", choices=["h264", "h265"], help="Video codec (h264 or h265)")
    parser.add_argument("--no-comparison", action="store_true", help="Skip generating before/after comparison image")

    args = parser.parse_args()

    enhance_video(
        input_path=args.input,
        output_path=args.output,
        preset_name=args.preset,
        resolution=args.resolution,
        target_fps=args.fps,
        motion_mode=args.motion_mode,
        enable_bloom=not args.no_bloom,
        cas_override=args.sharpness,
        contrast_override=args.contrast,
        saturation_override=args.saturation,
        brightness_override=args.brightness,
        gamma_override=args.gamma,
        denoise_override=args.denoise,
        bitrate_override=args.bitrate,
        codec=args.codec,
        generate_comparison=not args.no_comparison,
    )


if __name__ == "__main__":
    main()
