// Retargeting de poses (MediaPipe / WiLoR) a un avatar VRM1. Usado por compare.html.
// (TODO: index.html tiene una copia de esta lógica; unificar cuando el enfoque esté decidido.)
import * as THREE from 'three';
const K = window.Kalidokit;
const TH = { ThumbProximal: 'thumbMetacarpal', ThumbIntermediate: 'thumbProximal', ThumbDistal: 'thumbDistal' };
const FING = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'], JNT = ['Proximal', 'Intermediate', 'Distal'];
const DOWN = new THREE.Vector3(0, -1, 0);

export function createRig(vrm, cam, flags = {}) {
  const F = { flipxz: () => true, zinv: () => false, palm: () => false, ...flags };
  const bone = n => vrm.humanoid.getNormalizedBoneNode(n);
  const vname = k => { const m = k.match(/^(Left|Right)(Thumb\w+)$/); if (m) return m[1].toLowerCase() + TH[m[2]].replace(/^./, c => c.toUpperCase()); return k[0].toLowerCase() + k.slice(1); };
  const basis = (f, a) => { f = f.clone().normalize(); const n = f.clone().cross(a).normalize(), a2 = n.clone().cross(f).normalize(); return new THREE.Matrix4().makeBasis(a2, n, f); };

  // geometría real del avatar en T-pose
  vrm.scene.updateMatrixWorld(true);
  const GEO = {};
  for (const s of ['left', 'right']) {
    const wp = n => bone(s + n).getWorldPosition(new THREE.Vector3());
    const u = wp('UpperArm'), l = wp('LowerArm'), h = wp('Hand'), M = wp('MiddleProximal'), I = wp('IndexProximal'), Lp = wp('LittleProximal');
    GEO[s] = { x: u.x, restU: l.clone().sub(u).normalize(), restL: h.clone().sub(l).normalize(), B0: basis(M.sub(h), I.sub(Lp)) };
  }
  // pantalla volteada (espejo CSS): X mundo más negativo = derecha de pantalla
  const RB = GEO.left.x < GEO.right.x ? 'left' : 'right', LB = RB === 'left' ? 'right' : 'left', SWAP = RB === 'left';
  const RESTQ = {};
  for (const s of ['left', 'right']) { RESTQ[s + 'UpperArm'] = new THREE.Quaternion().setFromUnitVectors(GEO[s].restU, DOWN); bone(s + 'UpperArm').quaternion.copy(RESTQ[s + 'UpperArm']); }

  let SX = 1;
  const V3 = p => new THREE.Vector3(-p.x * SX, -p.y, F.zinv() ? p.z : -p.z);
  const V3a = a => V3({ x: a[0], y: a[1], z: a[2] });
  const calibrate = W => { if (Math.abs(W[11].x - W[12].x) > 0.1) SX = W[12].x > W[11].x ? 1 : -1; };

  function ikArm(W, vis, uside, iS, iE, iW) {
    if (Math.min(vis[iS], vis[iE]) < 0.45 || vis[iW] < 0.25) return false;
    const bn = uside === 'right' ? RB : LB, g = GEO[bn], up = bone(bn + 'UpperArm'), lo = bone(bn + 'LowerArm');
    const dU = V3(W[iE]).sub(V3(W[iS])).normalize(), dL = V3(W[iW]).sub(V3(W[iE])).normalize();
    up.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(g.restU, dU), 0.55);
    lo.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(g.restL, dL.applyQuaternion(up.quaternion.clone().invert())), 0.55);
    return true;
  }
  const arms = (W, vis) => { calibrate(W); return ikArm(W, vis, 'left', 11, 13, 15) | ikArm(W, vis, 'right', 12, 14, 16); };

  // muñeca: orientación de la mano a partir de puntos 3D (P(i) → Vector3 ya en espacio avatar)
  function wrist(side, P) {
    const bn = side === 'Right' ? RB : LB, g = GEO[bn], up = bone(bn + 'UpperArm'), lo = bone(bn + 'LowerArm'), hand = bone(bn + 'Hand');
    const f = P(9).sub(P(0)), a = P(5).sub(P(17)); if (f.lengthSq() < 1e-10 || a.lengthSq() < 1e-10) return;
    if (F.palm()) a.negate();
    const qW = new THREE.Quaternion().setFromRotationMatrix(basis(f, a).multiply(g.B0.clone().transpose()));
    hand.quaternion.slerp(up.quaternion.clone().multiply(lo.quaternion).invert().multiply(qW), 0.5);
  }

  // dedos desde puntos 3D (WiLoR): ángulo de flexión de cada falange, aplicado sobre el eje de flexión medido del avatar
  function fingersGeo(side, P) {
    const bn = side === 'Right' ? RB : LB, g = GEO[bn];
    const a0 = new THREE.Vector3().setFromMatrixColumn(g.B0, 0), f0 = new THREE.Vector3().setFromMatrixColumn(g.B0, 2);
    const axis = a0.clone().multiplyScalar(a0.clone().cross(f0).dot(DOWN) > 0 ? 1 : -1); // flexionar = bajar hacia la palma (palma abajo en T-pose)
    [5, 9, 13, 17].forEach((b, k) => {
      const v0 = P(b).sub(P(0)), v1 = P(b + 1).sub(P(b)), v2 = P(b + 2).sub(P(b + 1)), v3 = P(b + 3).sub(P(b + 2));
      const ang = [v0.angleTo(v1), v1.angleTo(v2), v2.angleTo(v3)];
      JNT.forEach((j, i) => { const n = bone(bn + FING[k + 1] + j); if (!n) return;
        n.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(axis, Math.min(1.75, ang[i])), 0.5); });
    });
  }

  // dedos con Kalidokit (landmarks 2D/3D de MediaPipe). only='Thumb' para solo el pulgar.
  function fingersKal(side, lm, only) {
    let s2 = side, L2 = lm; if (SWAP) { s2 = side === 'Left' ? 'Right' : 'Left'; L2 = lm.map(p => ({ x: 1 - p.x, y: p.y, z: p.z })); }
    const h = K.Hand.solve(L2, s2); if (!h) return;
    const fl = F.flipxz() ? -1 : 1;
    for (const f of (only ? [only] : FING)) for (const j of JNT) { const r = h[s2 + f + j], n = bone(vname(s2 + f + j)); if (!n || !r) continue;
      n.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x * fl, r.y, r.z * fl)), 0.5); }
  }
  // mano completa solo con MediaPipe (muñeca geométrica desde hw + dedos Kalidokit)
  const handMP = (side, lm, hw) => { if (hw) wrist(side, i => V3a([hw[i].x, hw[i].y, hw[i].z])); fingersKal(side, lm); };

  function restHand(side, l = 0.15) {
    const bn = side === 'Right' ? RB : LB, names = [bn + 'Hand'];
    for (const f of FING) for (const j of (f === 'Thumb' ? ['Metacarpal', 'Proximal', 'Distal'] : JNT)) names.push(bn + f + j);
    for (const nm of names) bone(nm)?.quaternion.slerp(new THREE.Quaternion(), l);
  }
  const restArms = l => { for (const k in RESTQ) bone(k).quaternion.slerp(RESTQ[k], l); for (const s of ['left', 'right']) bone(s + 'LowerArm').quaternion.slerp(new THREE.Quaternion(), l); };

  return { arms, wrist, fingersGeo, fingersKal, handMP, restHand, restArms, V3a, RB, LB, SWAP };
}
