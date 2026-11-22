"""Servidor local de la prueba de reconocimiento de señas. Uso: python3 lab/v5_reconocimiento/server.py → http://localhost:8766
Guarda las muestras (landmarks MediaPipe) en data/reco/ETIQUETA__k.json (gitignored)."""
import json, re, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

HERE = Path(__file__).resolve().parent
RECO = HERE.parents[1] / "data" / "reco"; RECO.mkdir(parents=True, exist_ok=True)
VID = HERE.parents[1] / "data" / "signs-video"   # symlink a los videos crudos del avatar (no se versionan)
RUNS = RECO / "runs"; RUNS.mkdir(exist_ok=True)   # corridas de prueba guiada (con frames crudos para reajustar sin volver a señar)
OK = re.compile(r"[A-Z0-9_-]{1,40}")

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(HERE), **k)
    def _json(self, o, c=200):
        b = json.dumps(o).encode(); self.send_response(c); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if urlparse(self.path).path == "/api/muestras":
            return self._json([dict(json.loads(f.read_text()), file=f.stem) for f in sorted(RECO.glob("*.json"))])
        if urlparse(self.path).path == "/api/corridas":
            out = []
            for f in sorted(RUNS.glob("*.json")):
                d = json.loads(f.read_text()); out.append({k: d.get(k) for k in ("file", "frase", "exp", "det", "H", "S", "D", "I", "ts", "sens", "soloDemo")} | {"file": f.stem})
            return self._json(out)
        if urlparse(self.path).path == "/api/videos":   # tomas del avatar disponibles para importar como plantillas
            return self._json([f.stem for f in sorted(VID.glob("*.webm")) if not f.stem.startswith("FRASE")])
        m = re.fullmatch(r"/video/([A-Z0-9_-]+)\.webm", urlparse(self.path).path)
        if m and (VID / f"{m.group(1)}.webm").exists():
            b = (VID / f"{m.group(1)}.webm").read_bytes(); self.send_response(200); self.send_header("Content-Type", "video/webm")
            self.send_header("Content-Length", str(len(b))); self.end_headers(); return self.wfile.write(b)
        return super().do_GET()
    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path == "/api/muestra":
            l = q.get("label", [""])[0].upper()
            if not OK.fullmatch(l): return self._json({"error": "etiqueta inválida"}, 400)
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)))); d["label"] = l
            k = len(list(RECO.glob(f"{l}__*.json"))) + 1
            while (RECO / f"{l}__{k}.json").exists(): k += 1
            (RECO / f"{l}__{k}.json").write_text(json.dumps(d, separators=(",", ":")))
            return self._json({"ok": True, "file": f"{l}__{k}"})
        if u.path == "/api/corrida":
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)))); fr = re.sub(r"[^A-Z0-9]", "", str(d.get("frase", "X")).upper())
            n = f"{int(time.time())}_{fr}"; (RUNS / f"{n}.json").write_text(json.dumps(d, separators=(",", ":"))); return self._json({"ok": True, "file": n})
        if u.path == "/api/borrar":
            f = q.get("file", [""])[0].upper()
            if not re.fullmatch(r"[A-Z0-9_-]{1,40}__\d+", f): return self._json({"error": "nombre"}, 400)
            (RECO / f"{f}.json").unlink(missing_ok=True); return self._json({"ok": True})
        return self._json({"error": "ruta"}, 404)
    def log_message(self, *a): pass

if __name__ == "__main__":
    print("http://localhost:8766  (muestras →", RECO, ")")
    ThreadingHTTPServer(("127.0.0.1", 8766), H).serve_forever()
