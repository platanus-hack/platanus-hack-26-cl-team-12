"""Aprende las transiciones entre palabras a partir de las frases grabadas de corrido.

  python3 ml/learn_transitions.py            # usa todas las data/signs/anim/FRASE-*.json → data/signs/transitions.json

Para cada frase: ubica cada palabra (su animación suelta) dentro del clip de la frase con DTW de subsecuencia
(en orden), y para cada par vecino A→B guarda el "puente": los cuadros reales de la frase alrededor del empalme,
más el punto de A donde entra el puente (tA) y el punto de B donde se sale (tB).
En chain.html las palabras siguen siendo sueltas: solo el empalme usa el movimiento real de la frase.
"""
import json, re
from pathlib import Path
import numpy as np
from fuse_takes import frame_cost

ROOT = Path(__file__).resolve().parents[1]
ANIM = ROOT / 'data/signs/anim'
W = 8            # medio ancho del puente, en cuadros (8 = 0,27 s a cada lado del empalme)
MAX_BACK = 12    # cuánto puede empezar una palabra antes de que termine la anterior (cuadros)


def load(name):
    c = json.loads((ANIM / f'{name}.json').read_text())
    return c['bones'], np.array([f['q'] for f in c['frames']], float).reshape(len(c['frames']), len(c['bones']), 4)


def sdtw(A, P, w):
    """DTW de subsecuencia: la palabra A (n) contra un tramo cualquiera de la frase P (m). Devuelve (inicio, fin, costo, camino)."""
    C = frame_cost(A, P, w); n, m = C.shape
    D = np.full((n, m), np.inf); D[0] = C[0]
    for i in range(1, n):
        for j in range(m):
            b = D[i - 1, j]
            if j: b = min(b, D[i, j - 1], D[i - 1, j - 1])
            D[i, j] = C[i, j] + b
    e = int(np.argmin(D[n - 1])); i, j, path = n - 1, e, [(n - 1, e)]
    while i > 0:
        cand = [(D[i - 1, j], i - 1, j)] + ([(D[i, j - 1], i, j - 1), (D[i - 1, j - 1], i - 1, j - 1)] if j else [])
        _, i, j = min(cand); path.append((i, j))
    path.reverse()
    return path[0][1], e, D[n - 1, e] / len(path), path


def gdtw(R, P, w, pen=0.004):
    """DTW con inicio y fin libres sobre la frase: R (referencia concatenada) contra P (frase). Penaliza los pasos no diagonales
    para que el alineamiento no se amontone en pocos cuadros. Devuelve el camino [(i en R, j en P)]."""
    C = frame_cost(R, P, w); n, m = C.shape
    D = np.full((n, m), np.inf); D[0] = C[0]; B = np.zeros((n, m), np.int8)
    for i in range(1, n):
        for j in range(m):
            c = [D[i - 1, j - 1] if j else np.inf, D[i - 1, j] + pen, D[i, j - 1] + pen if j else np.inf]
            k = int(np.argmin(c)); D[i, j] = C[i, j] + c[k]; B[i, j] = k
    j = int(np.argmin(D[n - 1])); i = n - 1; path = [(i, j)]
    while i > 0:
        k = B[i, j]
        if k == 0: i, j = i - 1, j - 1
        elif k == 1: i -= 1
        else: j -= 1
        path.append((i, j))
    return path[::-1]


def resolve(tok, names):
    t = tok.upper()
    return t if t in names else next((n for n in names if n.startswith(t + '-') or n.startswith(t)), None)


def main():
    guion = json.loads((ROOT / 'data/vocab/guion1_urgencia_caida.json').read_text())
    names = sorted(f.stem for f in ANIM.glob('*.json') if not f.stem.startswith('FRASE-'))
    out = {}
    for f in sorted(ANIM.glob('FRASE-*.json')):
        e = next((x for x in guion if x['id'].upper() == f.stem), None)
        if not e or '→' not in e['significa']: print('sin guion para', f.stem); continue
        toks = [t for t in re.split(r'[\s/]+', e['significa'].split('→')[1].strip()) if t]
        words = [(t, resolve(t, names)) for t in toks]
        bones, P = load(f.stem)
        wt = np.array([3.0 if b.endswith(('UpperArm', 'LowerArm')) else 2.0 if b.endswith('Hand') else 1.0 for b in bones])
        # alineamiento GLOBAL: las palabras sueltas se concatenan en orden y se alinean de una vez contra toda la frase
        # (así ninguna palabra puede "robarse" el tramo de otra ni quedar en un solo cuadro)
        ref, owner = [], []
        for k, (tok, n) in enumerate(words):
            if not n: print(f'  {f.stem}: {tok} sin animación suelta, se omite'); continue
            _, A = load(n); ref.append(A); owner += [k] * len(A)
        R = np.concatenate(ref); owner = np.array(owner)
        path = gdtw(R, P, wt)
        seg = [None] * len(words)
        for k, (tok, n) in enumerate(words):
            idx = np.where(owner == k)[0]
            if not len(idx): continue
            pts = [(i, j) for i, j in path if owner[i] == k]; off = idx[0]
            js = [j for _, j in pts]; s_, e_ = min(js), max(js)
            m = {}
            for i, j in pts: m.setdefault(j, []).append(i - off)
            cost = float(np.mean([frame_cost(R[i:i + 1], P[j:j + 1], wt)[0, 0] for i, j in pts]))
            seg[k] = dict(n=n, s=s_, e=e_, cost=cost, m={j: int(np.mean(v)) for j, v in m.items()}, len=len(idx))
            print(f'  {f.stem}: {n:13s} frases[{s_:3d}-{e_:3d}] ({e_ - s_ + 1:3d} cuadros vs {len(idx):3d} sueltos) costo {cost:.3f}')
        pairs = [(a, b) for a, b in zip(seg, seg[1:]) if a and b]
        for a, b in pairs:
            j = (a['e'] + b['s']) // 2; j0, j1 = max(0, j - W), min(len(P) - 1, j + W)
            ja = max((k for k in a['m'] if k <= j0), default=None); jb = min((k for k in b['m'] if k >= j1), default=None)
            if ja is None or jb is None: continue
            tA, tB = a['m'][ja], b['m'][jb]
            if tA < 4 or tB > b['len'] - 4: continue
            key = f"{a['n']}>{b['n']}"; cost = a['cost'] + b['cost']
            if key in out and out[key]['cost'] <= cost: continue
            out[key] = dict(cost=round(float(cost), 4), tA=tA, tB=tB, frase=f.stem,
                            q=np.round(P[j0:j1 + 1].reshape(j1 - j0 + 1, -1), 4).tolist())
    dst = ROOT / 'data/signs/transitions.json'
    dst.write_text(json.dumps(dict(bones=bones, fps=30, pares=out), separators=(',', ':')))
    print(f'{len(out)} transiciones → {dst.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
