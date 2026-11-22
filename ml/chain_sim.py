"""Mide objetivamente qué tan fluido queda el empalme entre dos señas, con distintos métodos de encadenado.
Simula todas las parejas ordenadas (A→B) de las animaciones en data/signs/anim y compara:
  corte   : A y luego B pegadas, sin transición (salto)
  lineal  : transición fija de 0,3 s hacia la pose inicial de B, sin solape (lo que había antes)
  solape  : las señas se solapan y se mezclan con curva quíntica; el largo depende de cuánto cambia la pose
Métricas en la ventana del empalme: velocidad pico, aceleración pico (rad/s y rad/s²) y salto máximo entre muestras.
Referencia: la aceleración típica (percentil 95) DENTRO de las señas sueltas. Si el empalme no la supera, no se nota.
  python3 ml/chain_sim.py
"""
import json, itertools, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
HZ = 60

def load():
    out = {}
    for f in sorted((ROOT / 'data/signs/anim').glob('*.json')):
        c = json.loads(f.read_text()); b = c['bones']
        q = np.array([fr['q'] for fr in c['frames']]).reshape(len(c['frames']), len(b), 4)
        out[f.stem] = dict(bones=b, q=q, t=np.array([fr['t'] for fr in c['frames']]), dur=c['duration'])
    return out

def slerp(a, b, w):
    d = np.sum(a * b, -1, keepdims=True); b = np.where(d < 0, -b, b); d = np.abs(d)
    th = np.arccos(np.clip(d, 0, 1)); s = np.sin(th)
    k = s > 1e-4
    w0 = np.where(k, np.sin((1 - w) * th) / np.where(k, s, 1), 1 - w); w1 = np.where(k, np.sin(w * th) / np.where(k, s, 1), w)
    r = w0 * a + w1 * b
    return r / np.linalg.norm(r, axis=-1, keepdims=True)

def sample(c, lt):
    lt = float(np.clip(lt, 0, c['dur'])); i = int(np.clip(np.searchsorted(c['t'], lt, 'right') - 1, 0, len(c['t']) - 2))
    a, b = c['t'][i], c['t'][i + 1]; w = (lt - a) / (b - a) if b > a else 0
    return slerp(c['q'][i], c['q'][i + 1], w)

smooth5 = lambda u: u ** 3 * (u * (6 * u - 15) + 10)
smooth3 = lambda u: u * u * (3 - 2 * u)

def ang(a, b): return 2 * np.arccos(np.clip(np.abs(np.sum(a * b, -1)), 0, 1))

def pair_dist(A, B):  # cuánto cambia la pose entre el final de A y el inicio de B (máx. entre brazos/manos)
    idx = [i for i, x in enumerate(A['bones']) if x.endswith(('UpperArm', 'LowerArm', 'Hand'))]
    return ang(A['q'][-1][idx], B['q'][0][idx]).max()

def timeline(A, B, method, max_ov=0.45, speed=1.0):
    """Devuelve (t, poses[T,huesos,4], t_empalme) muestreado a HZ."""
    dA, dB = A['dur'] / speed, B['dur'] / speed
    if method == 'corte':
        T = dA + dB; join = dA
        f = lambda t: sample(A, t * speed) if t < dA else sample(B, (t - dA) * speed)
    elif method == 'lineal':
        tr = 0.3; T = dA + tr + dB; join = dA; pa, pb = A['q'][-1], B['q'][0]
        f = lambda t: sample(A, t * speed) if t < dA else (slerp(pa, pb, smooth3((t - dA) / tr)) if t < dA + tr else sample(B, (t - dA - tr) * speed))
    else:
        ov = min(max_ov * min(1, 0.25 + pair_dist(A, B) / 1.2), 0.45 * dA, 0.45 * dB)
        sB = dA - ov; T = sB + dB; join = sB
        def f(t):
            if t < sB: return sample(A, t * speed)
            if t > dA: return sample(B, (t - sB) * speed)
            return slerp(sample(A, t * speed), sample(B, (t - sB) * speed), smooth5((t - sB) / ov))
    ts = np.arange(0, T, 1 / HZ)
    return ts, np.stack([f(t) for t in ts]), join

def stats(ts, P, join, win=0.35):
    idx = [i for i, b in enumerate(ALL[next(iter(ALL))]['bones']) if b.endswith(('UpperArm', 'LowerArm', 'Hand'))]
    ang_step = ang(P[1:, idx], P[:-1, idx])                       # (T-1, huesos)
    v = np.sort(ang_step, 1)[:, -4:].mean(1) * HZ                # rad/s de los 4 huesos que más se mueven
    a = np.abs(np.diff(v)) * HZ                                  # rad/s²
    t_mid = ts[1:-1]
    m = (t_mid > join - win) & (t_mid < join + win)
    return dict(vpico=v[(ts[1:] > join - win) & (ts[1:] < join + win)].max(), apico=a[m].max(), salto=ang_step[(ts[1:] > join - win) & (ts[1:] < join + win)].max())

ALL = load()
if __name__ == '__main__':
    names = list(ALL)
    if len(names) < 2: sys.exit('Se necesitan al menos 2 animaciones en data/signs/anim')
    # aceleración típica dentro de las señas sueltas (percentil 95)
    base = []
    for c in ALL.values():
        ts = np.arange(0, c['dur'], 1 / HZ); P = np.stack([sample(c, t) for t in ts])
        idx = [i for i, b in enumerate(c['bones']) if b.endswith(('UpperArm', 'LowerArm', 'Hand'))]
        v = np.sort(ang(P[1:, idx], P[:-1, idx]), 1)[:, -4:].mean(1) * HZ; base.append(np.abs(np.diff(v)) * HZ)
    ref = np.percentile(np.concatenate(base), 95)
    print(f'{len(names)} señas, {len(names) * (len(names) - 1)} parejas. Aceleración típica dentro de una seña (p95): {ref:.1f} rad/s²\n')
    rows = [('corte', {}), ('lineal', {}), ('solape (máx 0,15 s)', dict(max_ov=0.15)), ('solape (máx 0,30 s)', dict(max_ov=0.30)),
            ('solape (máx 0,45 s)', dict(max_ov=0.45)), ('solape (máx 0,60 s)', dict(max_ov=0.60))]
    print(f'{"método":24s} {"vel pico":>9s} {"acel pico":>10s} {"× típica":>9s} {"salto máx":>10s}')
    for name, kw in rows:
        m = name.split(' ')[0]; S = []
        for A, B in itertools.permutations(names, 2):
            ts, P, j = timeline(ALL[A], ALL[B], m, **kw); S.append(stats(ts, P, j))
        g = lambda k: np.mean([s[k] for s in S])
        print(f'{name:24s} {g("vpico"):9.2f} {g("apico"):10.1f} {g("apico") / ref:9.1f} {g("salto"):10.3f}')
