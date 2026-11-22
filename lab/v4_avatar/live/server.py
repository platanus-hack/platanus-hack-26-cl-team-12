"""Servidor local del avatar en vivo: estáticos + guardar/listar animaciones por glosa.
Uso: python3 lab/v4_avatar/live/server.py  →  http://localhost:8765
"""
import shutil, time, json, re
import numpy as np
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

HERE = Path(__file__).resolve().parent
ANIM = HERE.parents[2] / "data" / "signs" / "anim"
ANIM.mkdir(parents=True, exist_ok=True)


def dur_frase(glosas, speed=1.0, max_ov=0.45):
    """Duración que tarda el avatar en señar una frase en chain.html (señas solapadas, reposo 0,3 s al inicio y 0,6 s al final)."""
    anim = HERE.parents[2] / "data" / "signs" / "anim"; names = sorted(f.stem for f in anim.glob("*.json") if not f.stem.startswith("FRASE-"))
    def res(t):
        t = t.upper(); return t if t in names else next((n for n in names if n.startswith(t + "-") or n.startswith(t)), None)
    cl = []
    for g in glosas:
        n = res(g)
        if n:
            c = json.loads((anim / f"{n}.json").read_text()); b = c["bones"]; F = c["frames"]
            idx = [i for i, x in enumerate(b) if x.endswith(("UpperArm", "LowerArm", "Hand"))]
            q = lambda fr: np.array(fr["q"]).reshape(len(b), 4)[idx]
            cl.append(dict(d=c["duration"] / speed, a=q(F[0]), z=q(F[-1])))
    if not cl: return None
    ang = lambda a, b: float((2 * np.arccos(np.clip(np.abs(np.sum(a * b, -1)), 0, 1))).max())
    seq = [dict(d=0.3, rest=True)] + cl + [dict(d=0.6, rest=True)]; end = 0.0
    for i, c in enumerate(seq):
        if i == 0: end = c["d"]; continue
        p = seq[i - 1]; dd = 1.0 if (c.get("rest") or p.get("rest")) else ang(p["z"], c["a"])   # contra el reposo se asume una distancia grande
        ov = min(max_ov * min(1, 0.25 + dd / 1.2), 0.45 * p["d"], 0.45 * c["d"]); end = end - ov + c["d"]
    return round(end, 2)


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(HERE), **k)
    def _json(self, obj, code=200):
        b = json.dumps(obj).encode(); self.send_response(code)
        self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        p = urlparse(self.path).path
        if p == "/api/anims": return self._json(sorted(f.stem for f in ANIM.glob("*.json") if not f.stem.startswith("FRASE-")))   # las frases enteras solo enseñan transiciones
        if p == "/api/transiciones":  # puentes entre palabras aprendidos de las frases (ml/learn_transitions.py)
            t = HERE.parents[2] / "data" / "signs" / "transitions.json"
            return self._json(json.loads(t.read_text()) if t.exists() else {"bones": [], "pares": {}})
        if p == "/api/escenario":  # lista cerrada de glosas a grabar (con su definición del diccionario)
            root = HERE.parents[2]
            g1 = root / "data/vocab/guion1_urgencia_caida.json"   # guion vigente; ?esc=hora_medica trae el anterior
            old = parse_qs(urlparse(self.path).query).get("esc", [""])[0] == "hora_medica"
            esc = json.loads(((root / "data/vocab/escenario_hora_medica.json") if (old or not g1.exists()) else g1).read_text())
            defs = {}
            gl = root / "data/vocab/glosario.jsonl"
            if gl.exists():
                for line in gl.read_text().splitlines():
                    d = json.loads(line); defs[d["id"]] = d
            df = root / "data/vocab/descripciones_senas.json"
            desc = json.loads(df.read_text()) if df.exists() else {}
            for e in esc:
                d = defs.get(e["id"], {}); e["definicion"] = d.get("definicion"); e["clase"] = d.get("clase")
                e["descripcion"] = desc.get(e["id"], {}).get("descripcion")
            if not old and g1.exists():  # estado de grabación: solo cuenta lo hecho desde el inicio del guion 1
                ini = root / "data/vocab/guion1_inicio.txt"; since = float(ini.read_text()) if ini.exists() else 0
                sg = root / "data" / "signs"; fresh = lambda p: p.exists() and p.stat().st_mtime > since
                for e in esc:
                    n = e["id"].upper()
                    e["estado"] = {"tomas": sum(fresh(p) for p in (sg / "video").glob(f"{n}__*.webm")),
                                   "wilor": sum(fresh(p) for p in (sg / "wilor").glob(f"{n}__*")),
                                   "baked": sum(fresh(p) for p in (sg / "baked").glob(f"{n}__*.json")),
                                   "anim": fresh(sg / "anim" / f"{n}.json")}
            for e in esc:  # frases: cuánto dura el avatar señándolas (para que el timer de grabación sea igual)
                if e.get("tipo") == "frase" and "→" in (e.get("significa") or ""):
                    e["duracion_avatar"] = dur_frase(re.split(r"[\s/]+", e["significa"].split("→")[1].strip()))
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
        if u.path == "/api/borrar-ultima":  # manda la última toma de video de una glosa (y sus derivados) a data/signs/_papelera
            n = (parse_qs(u.query).get("name", [""])[0]).upper()
            if not re.fullmatch(r"[A-Z0-9_-]{1,40}", n): return self._json({"error": "nombre inválido"}, 400)
            sg = HERE.parents[2] / "data" / "signs"; ts = {int(m.group(1)): p for p in (sg / "video").glob(f"{n}__*.webm") if (m := re.fullmatch(rf"{re.escape(n)}__(\d+)\.webm", p.name))}
            if not ts: return self._json({"error": "no hay tomas de " + n}, 404)
            k = max(ts); pap = sg / "_papelera"; pap.mkdir(exist_ok=True); moved = []
            for p in [ts[k], sg / "wilor" / f"{n}__{k}", sg / "baked" / f"{n}__{k}.json"]:
                if p.exists():
                    dst = pap / f"{int(time.time())}_{p.name}"; shutil.move(str(p), str(dst)); moved.append(p.name)
            return self._json({"ok": True, "toma": k, "movidos": moved, "quedan": len(ts) - 1})
        if u.path == "/api/bake":  # animación "cocida" de una toma (se fusionan después con ml/fuse_takes.py)
            n = (parse_qs(u.query).get("name", [""])[0]).upper()
            if not re.fullmatch(r"[A-Z0-9_-]{1,40}", n): return self._json({"error": "nombre inválido"}, 400)
            bd = HERE.parents[2] / "data" / "signs" / "baked"; bd.mkdir(parents=True, exist_ok=True)
            (bd / f"{n}.json").write_bytes(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            return self._json({"ok": True})
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
