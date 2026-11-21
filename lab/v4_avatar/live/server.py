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
        if p == "/api/escenario":  # lista cerrada de glosas a grabar (con su definición del diccionario)
            root = HERE.parents[2]; esc = json.loads((root / "data/vocab/escenario_hora_medica.json").read_text())
            defs = {}
            gl = root / "data/vocab/glosario.jsonl"
            if gl.exists():
                for line in gl.read_text().splitlines():
                    d = json.loads(line); defs[d["id"]] = d
            for e in esc:
                d = defs.get(e["id"], {}); e["definicion"] = d.get("definicion"); e["clase"] = d.get("clase")
            return self._json(esc)
        m = re.fullmatch(r"/api/wilor/([A-Z0-9_-]+)", p)
        if m:
            f = HERE.parents[2] / "data" / "signs" / "wilor" / f"{m[1]}.wilor.json"
            return self._json(json.loads(f.read_text())) if f.exists() else self._json({"error": "sin datos WiLoR"}, 404)
        m = re.fullmatch(r"/video/([A-Z0-9_-]+)\.webm", p)
        if m:
            f = HERE.parents[2] / "data" / "signs" / "video" / f"{m[1]}.webm"
            if f.exists():
                b = f.read_bytes(); self.send_response(200); self.send_header("Content-Type", "video/webm")
                self.send_header("Content-Length", str(len(b))); self.end_headers(); return self.wfile.write(b)
            return self._json({"error": "sin video"}, 404)
        m = re.fullmatch(r"/img/([a-z0-9_-]+)\.png", p)
        if m:
            f = HERE.parents[2] / "data" / "signs" / "img" / f"{m[1]}.png"
            if f.exists():
                b = f.read_bytes(); self.send_response(200); self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(b))); self.end_headers(); return self.wfile.write(b)
            return self._json({"error": "sin foto"}, 404)
        m = re.fullmatch(r"/anim/([A-Z0-9_-]+)\.json", p)
        if m:
            f = ANIM / f"{m[1]}.json"
            if f.exists(): return self._json(json.loads(f.read_text()))
            return self._json({"error": "no existe"}, 404)
        return super().do_GET()
    def do_POST(self):
        u = urlparse(self.path)
        if u.path == "/api/video":  # video crudo de la cámara para procesar offline (WiLoR)
            n = (parse_qs(u.query).get("name", [""])[0]).upper()
            if not re.fullmatch(r"[A-Z0-9_-]{1,40}", n): return self._json({"error": "nombre inválido"}, 400)
            vd = HERE.parents[2] / "data" / "signs" / "video"; vd.mkdir(parents=True, exist_ok=True)
            k = len(list(vd.glob(f"{n}__*.webm"))) + 1  # cada grabación es una toma nueva: NOMBRE__1, NOMBRE__2...
            f = vd / f"{n}__{k}.webm"; f.write_bytes(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            return self._json({"ok": True, "path": str(f.relative_to(HERE.parents[2])), "bytes": f.stat().st_size, "toma": k})
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
