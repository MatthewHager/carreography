"""Receives video frames rendered in the 3D viewer: POST raw JPEG bytes to /<dir>/<name>.jpg and
they are written under the directory given on the command line. Used by the video recorder
(see README, "Recording a preview video").

    python3 tools/frame_sink.py <out_dir> [port=8767]
"""
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        rel = Path(self.path.strip("/"))
        dest = (ROOT / rel).resolve()
        if ROOT not in dest.parents or dest.suffix != ".jpg":
            self.send_response(400)
            self.end_headers()
            return
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(self.rfile.read(n))
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b"ok")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST")
        self.end_headers()

    def log_message(self, *a):
        pass


HTTPServer(("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 8767), H).serve_forever()
