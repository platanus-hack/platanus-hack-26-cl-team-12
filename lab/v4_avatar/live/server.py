"""Servidor local del avatar en vivo: estáticos + guardar/listar animaciones por glosa.
Uso: python3 lab/v4_avatar/live/server.py  →  http://localhost:8765
"""
import json, re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

HERE = Path(__file__).resolve().parent
ANIM = HERE.parents[2] / "data" / "signs" / "anim"
ANIM.mkdir(parents=True, exist_ok=True)

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(HERE), **k)
    def _json(self, obj, code=200):
        b = json.dumps(obj).encode(); self.send_response(code)
        self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        p = urlparse(self.path).path
        if p == "/api/anims": return self._json(sorted(f.stem for f in ANIM.glob("*.json")))
        m = re.fullmatch(r"/anim/([A-Z0-9_-]+)\.json", p)
        if m:
            f = ANIM / f"{m[1]}.json"
            if f.exists(): return self._json(json.loads(f.read_text()))
            return self._json({"error": "no existe"}, 404)
        return super().do_GET()
    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/api/save": return self._json({"error": "ruta"}, 404)
        g = (parse_qs(u.query).get("glosa", [""])[0]).upper()
        if not re.fullmatch(r"[A-Z0-9_-]{1,40}", g): return self._json({"error": "nombre de glosa inválido"}, 400)
        data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        (ANIM / f"{g}.json").write_text(json.dumps(data, separators=(",", ":")))
        self._json({"ok": True, "glosa": g, "frames": len(data.get("frames", []))})
    def log_message(self, *a): pass

if __name__ == "__main__":
    print("http://localhost:8765  (animaciones →", ANIM, ")")
    ThreadingHTTPServer(("127.0.0.1", 8765), H).serve_forever()
