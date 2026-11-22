"""Extrae poses de mano con WiLoR (offline, más preciso que MediaPipe) desde un video y lo compara con MediaPipe.

Uso (desde _tools/WiLoR, con el env conda `wilor`):
  PYTORCH_ENABLE_MPS_FALLBACK=1 python /ruta/ml/wilor_extract.py VIDEO.webm --out salida/HOLA
Genera:
  salida/HOLA.wilor.json     parámetros MANO por cuadro (rotaciones por dedo + orientación de muñeca + joints 3D)
  salida/HOLA.overlay.mp4    video con WiLoR (magenta) y MediaPipe (verde) dibujados encima, para comparar a ojo
La licencia de WiLoR/MANO es no comercial: esto es solo para el sandbox, no se sube al repo del equipo.
"""
import argparse, json, os, sys, time
from pathlib import Path
import cv2, numpy as np, torch
for _k, _v in dict(int=int, float=float, complex=complex, object=object, unicode=str, bool=bool, str=str).items():  # chumpy (para cargar MANO) usa alias viejos de numpy
    if not hasattr(np, _k): setattr(np, _k, _v)

sys.path.insert(0, os.getcwd())  # corre desde _tools/WiLoR
import types
for _m, _c in [('renderer', 'Renderer'), ('mesh_renderer', 'MeshRenderer'), ('skeleton_renderer', 'SkeletonRenderer')]:
    _mod = types.ModuleType('wilor.utils.' + _m); setattr(_mod, _c, type(_c, (), {'__init__': lambda self, *a, **k: None})); sys.modules['wilor.utils.' + _m] = _mod  # evita pyrender/EGL (no existe en Mac)
from wilor.models import load_wilor

def recursive_to(x, dev):  # MPS no soporta float64: convertir a float32
    if isinstance(x, dict): return {k: recursive_to(v, dev) for k, v in x.items()}
    if isinstance(x, torch.Tensor): return (x.float() if x.dtype == torch.float64 else x).to(dev)
    if isinstance(x, list): return [recursive_to(v, dev) for v in x]
    return x
from wilor.datasets.vitdet_dataset import ViTDetDataset

def cam_crop_to_full(cam_bbox, box_center, box_size, img_size, focal_length=5000.):
    # copia de wilor.utils.renderer (ese módulo exige EGL, que no existe en Mac)
    img_w, img_h = img_size[:, 0], img_size[:, 1]
    cx, cy, b = box_center[:, 0], box_center[:, 1], box_size
    w_2, h_2 = img_w / 2., img_h / 2.
    bs = b * cam_bbox[:, 0] + 1e-9
    return torch.stack([(2 * (cx - w_2) / bs) + cam_bbox[:, 1], (2 * (cy - h_2) / bs) + cam_bbox[:, 2], 2 * focal_length / bs], dim=-1)
from ultralytics import YOLO

CONN = [(0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),(5,9),(9,10),(10,11),(11,12),(9,13),(13,14),(14,15),(15,16),(13,17),(17,18),(18,19),(19,20),(0,17)]

def project(points, cam_t, f, img_wh):
    p = points + cam_t
    p = p / p[:, 2:3]
    return np.stack([f * p[:, 0] + img_wh[0] / 2, f * p[:, 1] + img_wh[1] / 2], 1)

def draw(img, pts, col, r=3):
    for a, b in CONN:
        cv2.line(img, tuple(int(v) for v in pts[a]), tuple(int(v) for v in pts[b]), col, 2)
    for p in pts:
        cv2.circle(img, (int(p[0]), int(p[1])), r, col, -1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('--out', required=True)
    ap.add_argument('--no-mediapipe', action='store_true')
    a = ap.parse_args()
    dev = torch.device('mps') if torch.backends.mps.is_available() else torch.device('cpu')
    print('dispositivo:', dev)
    model, cfg = load_wilor(checkpoint_path='./pretrained_models/wilor_final.ckpt', cfg_path='./pretrained_models/model_config.yaml')
    model = model.to(dev).eval()
    _tl = torch.load  # torch>=2.6 bloquea pickles con clases de ultralytics; el detector es el oficial de WiLoR (descargado de su HF)
    torch.load = lambda *x, **k: _tl(*x, **{**k, 'weights_only': False})
    try: det = YOLO('./pretrained_models/detector.pt')
    finally: torch.load = _tl
    mp_hands = None
    if not a.no_mediapipe:
        import mediapipe as mp
        from mediapipe.tasks import python as mpt
        from mediapipe.tasks.python import vision as mpv
        mp_hands = mpv.HandLandmarker.create_from_options(mpv.HandLandmarkerOptions(
            base_options=mpt.BaseOptions(model_asset_path='./pretrained_models/hand_landmarker.task'),
            running_mode=mpv.RunningMode.VIDEO, num_hands=2,
            min_hand_detection_confidence=0.5, min_hand_presence_confidence=0.5, min_tracking_confidence=0.5))

    cap = cv2.VideoCapture(a.video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    W, H = int(cap.get(3)), int(cap.get(4))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    vw = cv2.VideoWriter(a.out + '.overlay.mp4', cv2.VideoWriter_fourcc(*'mp4v'), fps, (W, H))
    frames, t0, i = [], time.time(), 0
    while True:
        ok, img = cap.read()
        if not ok: break
        res = det(img, conf=0.3, verbose=False)[0]
        hands = []
        if len(res.boxes):
            boxes = res.boxes.data.cpu().numpy()[:, :4]; right = res.boxes.cls.cpu().numpy()
            ds = ViTDetDataset(cfg, img, boxes, right, rescale_factor=2.0)
            for batch in torch.utils.data.DataLoader(ds, batch_size=8, shuffle=False, num_workers=0):
                batch = recursive_to(batch, dev)
                with torch.no_grad(): out = model(batch)
                mult = 2 * batch['right'] - 1
                pc = out['pred_cam']; pc[:, 1] = mult * pc[:, 1]
                sf = cfg.EXTRA.FOCAL_LENGTH / cfg.MODEL.IMAGE_SIZE * batch['img_size'].float().max()
                cam_t = cam_crop_to_full(pc, batch['box_center'].float(), batch['box_size'].float(), batch['img_size'].float(), sf).cpu().numpy()
                for n in range(batch['img'].shape[0]):
                    isr = float(batch['right'][n].cpu())
                    j3 = out['pred_keypoints_3d'][n].cpu().numpy(); j3[:, 0] *= (2 * isr - 1)
                    j2 = project(j3, cam_t[n], float(sf), (W, H))
                    mp_ = out['pred_mano_params']
                    hands.append(dict(is_right=bool(isr), global_orient=mp_['global_orient'][n].cpu().numpy().round(5).tolist(),
                                      hand_pose=mp_['hand_pose'][n].cpu().numpy().round(5).tolist(),
                                      joints3d=j3.round(5).tolist(), joints2d=j2.round(1).tolist(), cam_t=cam_t[n].round(4).tolist()))
                    draw(img, j2, (255, 0, 255), 4)  # WiLoR: magenta
        if mp_hands is not None:
            r = mp_hands.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)), int(i * 1000 / fps))
            for hl in r.hand_landmarks:
                draw(img, np.array([[p.x * W, p.y * H] for p in hl]), (0, 220, 0), 2)  # MediaPipe: verde
        cv2.putText(img, 'WiLoR (magenta)  MediaPipe (verde)', (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        vw.write(img); frames.append(dict(t=round(i / fps, 3), hands=hands)); i += 1
        if i % 10 == 0: print(f'{i} cuadros, {(time.time()-t0)/i:.2f} s/cuadro', flush=True)
    vw.release()
    json.dump(dict(fps=fps, size=[W, H], frames=frames), open(a.out + '.wilor.json', 'w'), separators=(',', ':'))
    n_det = sum(1 for f in frames if f['hands'])
    print(f'listo: {len(frames)} cuadros, con mano detectada en {n_det}; {a.out}.overlay.mp4')

if __name__ == '__main__':
    main()
