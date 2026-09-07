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
    """Inspect video file and return resolution, framerate, duration, bitrate."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,duration,bit_rate,nb_frames",
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
        }
    except Exception as e:
        print(f"[WARN] Could not probe video thoroughly ({e}). Using defaults.", file=sys.stderr)
        return {"width": 1080, "height": 1920, "fps": 30.0, "duration": 0.0, "bitrate": 0}


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
    """Generate a side-by-side comparison JPEG highlighting Before vs After."""
    print(f"[*] Generating Before/After comparison snapshot: {output_image}")
    filter_expr = (
        "[0:v]scale=540:960[v0];"
        "[1:v]scale=540:960[v1];"
        "[v0][v1]hstack=inputs=2[outv]"
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
    print(f" Codec       : {codec.upper()} Master Bitrate: {preset.get('bitrate_mbps', 55)} Mbps")

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
    )

    bitrate_mbps = preset.get("bitrate_mbps", 55)
    
    # FFmpeg Command Assembly
    cmd = ["ffmpeg", "-y", "-i", local_input, "-filter_complex", filtergraph_str, "-map", "[outv]"]

    # Map original audio if present
    cmd.extend(["-map", "0:a?", "-c:a", "aac", "-b:a", "320k"])

    # Video Codec settings
    if codec.lower() in ["h265", "hevc"]:
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
    
    proc = subprocess.run(cmd, text=True, capture_output=True)
    elapsed = time.time() - start_time

    if proc.returncode != 0:
        print("[ERROR] FFmpeg pipeline failed!", file=sys.stderr)
        print("--- FFmpeg stderr output ---", file=sys.stderr)
        print(proc.stderr, file=sys.stderr)
        sys.exit(1)

    out_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print("\n" + "=" * 65)
    print(" ✅ PROCESSING COMPLETED SUCCESSFULLY!")
    print("=" * 65)
    print(f" Output File : {output_path}")
    print(f" File Size   : {out_size_mb:.2f} MB")
    print(f" Dimensions  : {out_w}x{out_h}")
    print(f" Frame Rate  : {target_fps} FPS")
    print(f" Total Time  : {elapsed:.2f} seconds")
    print("=" * 65)

    # Generate Comparison Image if requested
    if generate_comparison:
        comp_path = os.path.splitext(output_path)[0] + "_comparison.jpg"
        generate_comparison_image(local_input, output_path, comp_path)

    return {
        "output_path": output_path,
        "size_mb": out_size_mb,
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
        help="Target resolution (1080p, 2k, 4k, 8k)"
    )
    parser.add_argument(
        "-fps", "--fps",
        type=int,
        default=60,
        help="Target frame rate (30, 60, 120)"
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
        codec=args.codec,
        generate_comparison=not args.no_comparison,
    )


if __name__ == "__main__":
    main()
