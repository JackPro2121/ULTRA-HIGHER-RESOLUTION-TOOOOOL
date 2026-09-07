#!/usr/bin/env python3
"""Zero-Dependency Local Streaming Dashboard Server.

Compatible with Python 3.10 through 3.14+ (Zero deprecated modules).
Handles:
1. Serving the sleek Web Dashboard (HTML/CSS/JS)
2. Streaming unlimited size video uploads directly to disk without memory buffering
3. Probing video metadata (dimensions, fps, duration) via ffprobe
4. Triggering local enhancement pipeline jobs and reporting progress
"""

import json
import os
import shutil
import subprocess
import sys
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote

PORT = 8080
ROOT_DIR = Path(__file__).resolve().parent
WEB_DIR = ROOT_DIR / "web"
INPUTS_DIR = ROOT_DIR / "inputs"
OUTPUTS_DIR = ROOT_DIR / "outputs"

INPUTS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

# In-memory tracking for active local jobs
active_jobs = {}


class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            self.handle_api_status(parsed)
        elif parsed.path == "/api/outputs":
            self.handle_api_outputs()
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/upload":
            self.handle_api_upload(parsed)
        elif parsed.path == "/api/enhance":
            self.handle_api_enhance()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_api_outputs(self):
        files = []
        for f in OUTPUTS_DIR.glob("*.mp4"):
            stat = f.stat()
            files.append({
                "name": f.name,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": time.ctime(stat.st_mtime),
            })
        self.send_json_response({"files": files})

    def handle_api_status(self, parsed):
        params = parse_qs(parsed.query)
        job_id = params.get("id", [None])[0]
        if job_id and job_id in active_jobs:
            self.send_json_response(active_jobs[job_id])
        else:
            self.send_json_response({"jobs": active_jobs})

    def handle_api_upload(self, parsed):
        """Stream uploaded file chunk by chunk to disk (unlimited file size safe)."""
        content_length = int(self.headers.get("Content-Length", 0))
        params = parse_qs(parsed.query)
        filename = params.get("filename", ["uploaded_video.mp4"])[0]
        filename = os.path.basename(unquote(filename))

        save_path = INPUTS_DIR / filename
        print(f"[*] Receiving unlimited streaming upload: {filename} ({content_length / 1024 / 1024:.2f} MB)")

        bytes_read = 0
        chunk_size = 1024 * 1024 * 8  # 8 MB streaming buffer

        with open(save_path, "wb") as f_out:
            remaining = content_length
            while remaining > 0:
                to_read = min(chunk_size, remaining)
                chunk = self.rfile.read(to_read)
                if not chunk:
                    break
                f_out.write(chunk)
                remaining -= len(chunk)
                bytes_read += len(chunk)

        # Probe video using ffprobe if available
        probe_info = {}
        if shutil.which("ffprobe"):
            try:
                cmd = [
                    "ffprobe", "-v", "error", "-select_streams", "v:0",
                    "-show_entries", "stream=width,height,r_frame_rate,duration",
                    "-of", "json", str(save_path)
                ]
                res = subprocess.run(cmd, capture_output=True, text=True)
                p_data = json.loads(res.stdout)
                st = p_data.get("streams", [{}])[0]
                probe_info = {
                    "width": int(st.get("width", 1080)),
                    "height": int(st.get("height", 1920)),
                    "duration": round(float(st.get("duration", 0)), 1),
                }
            except Exception:
                pass

        self.send_json_response({
            "success": True,
            "filename": filename,
            "path": f"inputs/{filename}",
            "size_mb": round(os.path.getsize(save_path) / (1024 * 1024), 2),
            "probe": probe_info,
        })

    def handle_api_enhance(self):
        """Trigger local enhancement pipeline as background job."""
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")
        data = json.loads(post_data)

        input_path = data.get("input_path", "")
        preset = data.get("preset", "viral_tiktok_hdr")
        resolution = data.get("resolution", "4k")
        fps = int(data.get("fps", 60))
        motion_mode = data.get("motion_mode", "blend")
        codec = data.get("codec", "h264")
        bloom = bool(data.get("bloom", True))
        sharpness = data.get("sharpness")
        contrast = data.get("contrast")
        bitrate = data.get("bitrate")

        job_id = f"job_{int(time.time())}"
        out_name = f"enhanced_{preset}_{resolution}_{fps}fps.mp4"
        out_path = OUTPUTS_DIR / out_name

        active_jobs[job_id] = {
            "id": job_id,
            "status": "RUNNING",
            "progress_percent": 15,
            "output_file": out_name,
            "download_url": f"/outputs/{out_name}",
            "start_time": time.time(),
        }

        def run_worker():
            cmd = [
                sys.executable,
                str(ROOT_DIR / "core" / "pipeline.py"),
                "-i", input_path,
                "-o", str(out_path),
                "-p", preset,
                "-r", resolution,
                "-fps", str(fps),
                "-m", motion_mode,
                "--codec", codec,
            ]
            if not bloom:
                cmd.append("--no-bloom")
            if sharpness is not None:
                cmd.extend(["--sharpness", str(sharpness)])
            if contrast is not None:
                cmd.extend(["--contrast", str(contrast)])
            if bitrate is not None:
                cmd.extend(["--bitrate", str(bitrate)])

            try:
                subprocess.run(cmd, check=True)
                active_jobs[job_id]["status"] = "COMPLETED"
                active_jobs[job_id]["progress_percent"] = 100
            except Exception as e:
                active_jobs[job_id]["status"] = "FAILED"
                active_jobs[job_id]["error"] = str(e)

        thread = threading.Thread(target=run_worker, daemon=True)
        thread.start()

        self.send_json_response({"success": True, "job_id": job_id})

    def send_json_response(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def main():
    server = HTTPServer(("0.0.0.0", PORT), DashboardHandler)
    print("=" * 65)
    print(f" 🚀 HYPER-RES 8K/12K STREAMING DASHBOARD SERVER READY")
    print("=" * 65)
    print(f" URL: http://localhost:{PORT}")
    print(" Unlimited Uploads: ENABLED (Zero-memory 8MB chunked stream)")
    print(" Press Ctrl+C to stop.")
    print("=" * 65)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Server stopped.")


if __name__ == "__main__":
    main()
