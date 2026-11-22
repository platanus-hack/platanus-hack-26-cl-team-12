// Archivos del avatar 3D, bajados UNA vez por sesión de la app (antes el VRM de ~10 MB se volvía a bajar y parsear en
// cada llamada, y los clips se pedían uno tras otro). Sin three.js: se puede importar desde cualquier pantalla para
// precargar sin meter three en el bundle inicial.

export interface Clip {
  glosa: string;
  duration: number;
  frames: { t: number; q: number[] }[];
}

let modelo: Promise<ArrayBuffer> | null = null;
let indice: Promise<string[]> | null = null;
const clips = new Map<string, Promise<Clip & { bones: string[] }>>();

function unaVez<T>(crear: () => Promise<T>, guardar: (p: Promise<T> | null) => void): Promise<T> {
  const p = crear();
  guardar(p);
  p.catch(() => guardar(null)); // si falló (sin red), se reintenta la próxima vez
  return p;
}

export function modeloVRM(): Promise<ArrayBuffer> {
  return (
    modelo ??
    unaVez(
      () => fetch("/models/avatar.vrm").then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`avatar.vrm ${r.status}`)))),
      (p) => (modelo = p),
    )
  );
}

export function indiceAnimaciones(): Promise<string[]> {
  return indice ?? unaVez(() => fetch("/anim/index.json").then((r) => (r.ok ? r.json() : [])), (p) => (indice = p));
}

export function clipAnimacion(id: string): Promise<Clip & { bones: string[] }> {
  let p = clips.get(id);
  if (!p) {
    p = fetch(`/anim/${id}.json`).then((r) => r.json());
    clips.set(id, p);
    p.catch(() => clips.delete(id));
  }
  return p;
}

/** Empieza a bajar el modelo y el índice (al marcar: mientras suena el teléfono). */
export function precargarAvatar(): void {
  modeloVRM().catch(() => {});
  indiceAnimaciones().catch(() => {});
}
