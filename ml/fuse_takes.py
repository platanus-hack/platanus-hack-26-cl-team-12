"""Fusiona varias tomas "cocidas" de una misma seña en una sola animación limpia.

  python3 ml/fuse_takes.py HOLA            # usa data/signs/baked/HOLA__*.json → data/signs/anim/HOLA.json
  python3 ml/fuse_takes.py HOLA --takes 2 3 4

Pasos: recortar pausas del inicio/fin → alinear las tomas en el tiempo (DTW) → elegir la toma más consistente
(mediana) → promediar las demás alineadas a ella, descartando tomas atípicas → suavizar → guardar.
"""
import argparse, json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
WARMUP = 6


def load(path):
    c = json.loads(path.read_text())
    q = np.array([f['q'] for f in c['frames']], dtype=float).reshape(len(c['frames']), len(c['bones']), 4)
    return c['bones'], q


def trim(q, bones, thr=0.12, margin=3, k=6, tail=0):
    """Recorta las pausas del inicio y del final: el inicio mientras la pose no se aleje de la del primer cuadro,
    el final mientras no se acerque a la del último. Mide los k huesos que más se mueven (brazos, muñeca o dedos)."""
    def dist(ref):
        ang = 2 * np.arccos(np.clip(np.abs(np.sum(q * ref[None], -1)), 0, 1))   # (T, huesos)
        return np.sort(ang, 1)[:, -k:].mean(1)
    a_ = np.where(dist(q[0]) > thr)[0]; b_ = np.where(dist(q[-1]) > thr)[0]
    if len(a_) == 0 or len(b_) == 0: return q
    lo, hi = max(0, a_[0] - margin), min(len(q), b_[-1] + margin + 1 + tail)
    return q[lo:hi] if hi - lo >= 12 else q


def frame_cost(A, B, w):
    """Distancia entre dos poses: 1-|q·q'| por hueso, ponderada (brazos/muñeca pesan más que dedos)."""
    d = 1 - np.abs(np.einsum('ibk,jbk->ijb', A, B))
    return (d * w).sum(-1) / w.sum()


def dtw(A, B, w):
    C = frame_cost(A, B, w); n, m = C.shape
    D = np.full((n + 1, m + 1), np.inf); D[0, 0] = 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i, j] = C[i - 1, j - 1] + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])
    i, j, path = n, m, []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        k = np.argmin([D[i - 1, j - 1], D[i - 1, j], D[i, j - 1]])
        i, j = (i - 1, j - 1) if k == 0 else ((i - 1, j) if k == 1 else (i, j - 1))
    return D[n, m] / len(path), path[::-1]


def smooth(q, sigma=1.5):
    r = int(3 * sigma); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    pad = np.pad(q, ((r, r), (0, 0), (0, 0)), mode='edge')
    out = sum(k[i] * pad[i:i + len(q)] for i in range(2 * r + 1))
    return out / np.linalg.norm(out, axis=-1, keepdims=True)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('glosa'); ap.add_argument('--takes', nargs='*', type=int)
    ap.add_argument('--sigma', type=float, default=1.5)
    ap.add_argument('--tail', type=int, default=0, help='cuadros extra que se conservan al final (si la seña se corta antes)')
    ap.add_argument('--slow', type=float, default=1.0, help='estira la animación en el tiempo (1.4 = 40%% más lenta)')
    a = ap.parse_args()
    files = sorted((ROOT / 'data/signs/baked').glob(f'{a.glosa}__*.json'))
    if a.takes: files = [f for f in files if int(f.stem.split('__')[1]) in a.takes]
    if len(files) < 2: sys.exit(f'Se necesitan al menos 2 tomas cocidas de {a.glosa} (hay {len(files)}).')
    bones, _ = load(files[0])
    w = np.array([3.0 if b.endswith(('UpperArm', 'LowerArm')) else 2.0 if b.endswith('Hand') else 1.0 for b in bones])
    # los primeros cuadros de cada toma cocida son el avatar convergiendo desde el reposo (artefacto): se descartan
    takes = [trim(load(f)[1][WARMUP:], bones, tail=a.tail) for f in files]
    for f, t in zip(files, takes): print(f'{f.stem}: {len(t)} cuadros útiles ({len(t)/30:.2f} s)')
    n = len(takes)
    M = np.zeros((n, n)); paths = {}
    for i in range(n):
        for j in range(n):
            if i != j: M[i, j], paths[i, j] = dtw(takes[i], takes[j], w)
    score = M.sum(1)
    med = int(np.argmin(score))
    print('distancia entre tomas (menor = más parecidas):'); print(np.round(M, 3))
    print(f'toma más consistente: {files[med].stem}')
    base = takes[med]
    thr = 1.75 * np.median([M[med, j] for j in range(n) if j != med])
    acc, wts, used = [base.copy()], [2.0], [files[med].stem]
    for j in range(n):
        if j == med: continue
        if M[med, j] > thr: print(f'  descarto {files[j].stem} (atípica: {M[med, j]:.3f} > {thr:.3f})'); continue
        al = np.zeros_like(base); cnt = np.zeros(len(base))
        for i, jj in paths[med, j]:
            s = np.sign(np.sum(base[i] * takes[j][jj], -1, keepdims=True)); s[s == 0] = 1
            al[i] += s * takes[j][jj]; cnt[i] += 1
        al /= np.maximum(cnt, 1)[:, None, None]
        acc.append(al); wts.append(1.0); used.append(files[j].stem)
    fused = sum(wi * x for wi, x in zip(wts, acc)) / sum(wts)
    fused /= np.linalg.norm(fused, axis=-1, keepdims=True)
    fused = smooth(fused, a.sigma)
    if a.slow != 1.0:  # remuestrea a más/menos cuadros: interpolación lineal de cuaterniones (mismo signo) + normalizar
        T = len(fused); m = max(2, int(round((T - 1) * a.slow)) + 1); x = np.linspace(0, T - 1, m)
        i0 = np.floor(x).astype(int); i1 = np.minimum(i0 + 1, T - 1); fr = (x - i0)[:, None, None]
        b = fused[i1] * np.sign(np.sum(fused[i0] * fused[i1], -1, keepdims=True) + 1e-12)
        fused = (1 - fr) * fused[i0] + fr * b; fused /= np.linalg.norm(fused, axis=-1, keepdims=True)
    out = dict(glosa=a.glosa.upper(), fps=30, duration=round((len(fused) - 1) / 30, 3), bones=bones,
               fuente=dict(tomas=used, mediana=files[med].stem),
               frames=[dict(t=round(i / 30, 3), q=np.round(f.reshape(-1), 4).tolist()) for i, f in enumerate(fused)])
    dst = ROOT / 'data/signs/anim' / f'{a.glosa.upper()}.json'; dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(out, separators=(',', ':')))
    print(f'guardado {dst.relative_to(ROOT)}: {len(fused)} cuadros, {out["duration"]} s, tomas usadas: {used}')


if __name__ == '__main__':
    main()
