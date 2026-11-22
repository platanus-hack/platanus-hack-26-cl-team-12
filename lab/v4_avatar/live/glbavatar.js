// Carga un GLB humanoide (Avaturn / Mixamo-like) y lo expone con la misma interfaz que un VRM
// ({scene, humanoid.getNormalizedBoneNode, update}) para que rig.js y las animaciones guardadas funcionen igual.
// Huesos "normalizados": rotación identidad en reposo; se traducen a la rotación real con  q_real = Rp^-1 · q · Rb
// (Rb / Rp = rotación mundial en reposo del hueso / de su padre).
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const MAP = { hips:'Hips', spine:'Spine', chest:'Spine1', upperChest:'Spine2', neck:'Neck', head:'Head' };
const FM = { Thumb:['Thumb1','Thumb2','Thumb3'], Index:['Index1','Index2','Index3'], Middle:['Middle1','Middle2','Middle3'],
             Ring:['Ring1','Ring2','Ring3'], Little:['Pinky1','Pinky2','Pinky3'] };
const JN = { Thumb:['Metacarpal','Proximal','Distal'] }, JD = ['Proximal','Intermediate','Distal'];
for (const [s, S] of [['left','Left'],['right','Right']]) {
  Object.assign(MAP, { [s+'Shoulder']:S+'Shoulder', [s+'UpperArm']:S+'Arm', [s+'LowerArm']:S+'ForeArm', [s+'Hand']:S+'Hand',
    [s+'UpperLeg']:S+'UpLeg', [s+'LowerLeg']:S+'Leg', [s+'Foot']:S+'Foot', [s+'Toes']:S+'ToeBase' });
  for (const f in FM) (JN[f] || JD).forEach((j, i) => { MAP[s + f + j] = S + 'Hand' + FM[f][i]; });
}

export async function loadGlbAvatar(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const scene = gltf.scene; scene.updateMatrixWorld(true);
  const proxies = {};
  for (const [vn, gn] of Object.entries(MAP)) {
    const real = scene.getObjectByName(gn); if (!real) continue;
    const Rb = real.getWorldQuaternion(new THREE.Quaternion());
    const Rp = real.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    proxies[vn] = { real, Rb, RpInv: Rp, quaternion: new THREE.Quaternion(), getWorldPosition: v => real.getWorldPosition(v) };
  }
  const tmp = new THREE.Quaternion();
  return {
    scene, gltf,
    humanoid: { getNormalizedBoneNode: n => proxies[n] },
    update() { for (const p of Object.values(proxies)) p.real.quaternion.copy(tmp.copy(p.RpInv).multiply(p.quaternion).multiply(p.Rb)); },
  };
}
