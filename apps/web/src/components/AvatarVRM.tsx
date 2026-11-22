"use client";

// Avatar 3D del intérprete (v4, frente de Tomás): modelo VRM + animaciones grabadas por glosa (data/signs/anim, copiadas
// a public/anim por scripts/copiar_animaciones.mjs). Encadena las señas con solape y mezcla suave, como
// lab/v4_avatar/live/chain.html (versión simplificada: sin las transiciones aprendidas de frases).
// Si el modelo no carga (sin internet al instalar, navegador sin WebGL), avisa con onFalla y la app usa el dibujo.
// TODO(v4): reemplazar por el avatar que está entrenando el equipo cuando esté listo.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { isLiteralGloss } from "@puente/glosses";
import { clipAnimacion, indiceAnimaciones, modeloVRM, type Clip } from "@/lib/avatarAssets";

const FACTOR = { lenta: 1.5, normal: 1, rapida: 0.7 } as const;
const BONES: string[] = [];
for (const s of ["left", "right"]) {
  BONES.push(`${s}UpperArm`, `${s}LowerArm`, `${s}Hand`);
  for (const f of ["Thumb", "Index", "Middle", "Ring", "Little"])
    for (const j of f === "Thumb" ? ["Metacarpal", "Proximal", "Distal"] : ["Proximal", "Intermediate", "Distal"]) BONES.push(`${s}${f}${j}`);
}

/** "PÁLIDO" -> "PALIDO-A", "GRACIAS" -> "GRACIAS-1", "QUÉ" -> null si no hay animación. */
function resolver(glosa: string, ids: string[]): string | null {
  if (isLiteralGloss(glosa)) return null;
  const t = glosa.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, "-");
  return ids.find((i) => i === t) ?? ids.find((i) => i.startsWith(`${t}-`)) ?? null;
}

const ease = (u: number) => u * u * u * (u * (6 * u - 15) + 10);

export function AvatarVRM({
  glosas,
  frase,
  velocidad = "normal",
  onSenando,
  onProgreso,
  onFalla,
}: {
  glosas: string[];
  /** Cambia con cada frase nueva para reiniciar la secuencia. */
  frase: number;
  velocidad?: keyof typeof FACTOR;
  onSenando?: (senando: boolean) => void;
  /** Avance de la frase de 0 a 1 mientras el avatar firma (en 24 pasos): el subtítulo va apareciendo a la par. */
  onProgreso?: (fraccion: number) => void;
  onFalla?: () => void;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const motor = useRef<{
    reproducir: (glosas: string[], factor: number) => void;
  } | null>(null);
  const callbacks = useRef({ onSenando, onProgreso, onFalla });
  callbacks.current = { onSenando, onProgreso, onFalla };

  // Escena, modelo y bucle de dibujo (una sola vez).
  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    let vivo = true;
    let raf = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      callbacks.current.onFalla?.();
      return;
    }
    // Rendimiento: resolución moderada (en el celular no se nota) y se dibuja solo cuando hace falta (ver despertar).
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.6));
    const luz = new THREE.DirectionalLight(0xffffff, 1.4);
    luz.position.set(1, 2, 2);
    scene.add(luz);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    const ajustar = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / r.height;
      cam.updateProjectionMatrix();
      despertar(600);
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(canvas);

    const reloj = new THREE.Clock();
    let vrm: VRM | null = null;
    let REST: THREE.Quaternion[] = [];
    let ids: string[] = [];
    let generacion = 0; // cada frase nueva invalida la anterior que aún esté cargando sus clips
    let linea: { items: { c: Clip; d: number; s: number; e: number }[]; total: number; factor: number } | null = null;
    let t0 = 0;
    let senando = false;
    let ultimoPaso = -1; // último paso (de 24) de progreso informado
    let pendiente: [string[], number] | null = null; // frase que llegó antes de que cargara el modelo

    const hueso = (n: string) => vrm?.humanoid.getNormalizedBoneNode(n as never) ?? null;
    const muestra = (c: Clip, lt: number) => {
      lt = Math.max(0, Math.min(c.duration, lt));
      const F = c.frames;
      let i = 0;
      while (i < F.length - 2 && F[i + 1]!.t < lt) i++;
      const a = F[i]!;
      const b = F[Math.min(i + 1, F.length - 1)]!;
      const al = b.t > a.t ? Math.min(1, Math.max(0, (lt - a.t) / (b.t - a.t))) : 0;
      return BONES.map((_, k) => new THREE.Quaternion().fromArray(a.q, k * 4).slerp(new THREE.Quaternion().fromArray(b.q, k * 4), al));
    };
    const reposo = (d: number): Clip => {
      const q = REST.flatMap((x) => x.toArray());
      return { glosa: "", duration: d, frames: [{ t: 0, q }, { t: d, q }] };
    };

    async function cargarClip(id: string): Promise<Clip> {
      const c = await clipAnimacion(id);
      if (JSON.stringify(c.bones) !== JSON.stringify(BONES)) throw new Error(`${id}: huesos distintos`);
      return c;
    }

    motor.current = {
      async reproducir(lista, factor) {
        if (!vrm) {
          pendiente = [lista, factor];
          return;
        }
        const gen = ++generacion;
        // En paralelo (antes uno tras otro: N viajes de red seguidos en la primera frase).
        const cargados = await Promise.all(
          lista.map((g) => resolver(g, ids)).filter((id): id is string => !!id).map((id) => cargarClip(id).catch(() => null)),
        );
        if (gen !== generacion || !vivo) return; // llegó otra frase mientras cargaba: no pisarla con la vieja
        const clips = cargados.filter((c): c is Clip => !!c);
        const seq = [reposo(0.25), ...clips, reposo(0.5)];
        const items: { c: Clip; d: number; s: number; e: number }[] = [];
        seq.forEach((c, i) => {
          const d = c.duration * factor;
          let s = 0;
          if (i > 0) {
            const prev = items[i - 1]!;
            const ov = Math.min(0.35, 0.45 * prev.d, 0.45 * d); // solape: la seña siguiente empieza antes de que termine la anterior
            s = prev.e - ov;
          }
          items.push({ c, d, s, e: s + d });
        });
        linea = { items, total: items[items.length - 1]!.e, factor };
        t0 = performance.now();
        ultimoPaso = -1;
        despertar((linea.total + 0.6) * 1000);
      },
    };

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    Promise.all([modeloVRM().then((buf) => loader.parseAsync(buf, "/models/")), indiceAnimaciones()])
      .then(([gltf, lista]) => {
        if (!vivo) return;
        vrm = gltf.userData.vrm as VRM;
        ids = lista as string[];
        scene.add(vrm.scene);
        vrm.scene.updateMatrixWorld(true);
        // Brazos abajo en reposo (el modelo viene en T-pose), como createRig de lab/v4_avatar/live/rig.js.
        for (const s of ["left", "right"]) {
          const u = hueso(`${s}UpperArm`)!.getWorldPosition(new THREE.Vector3());
          const l = hueso(`${s}LowerArm`)!.getWorldPosition(new THREE.Vector3());
          hueso(`${s}UpperArm`)!.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(l.sub(u).normalize(), new THREE.Vector3(0, -1, 0)));
        }
        REST = BONES.map((b) => hueso(b)?.quaternion.clone() ?? new THREE.Quaternion());
        const cabeza = hueso("head")!.getWorldPosition(new THREE.Vector3());
        // Encuadre de videollamada: cabeza completa y manos sobre los subtítulos (que tapan el cuarto de abajo).
        cam.position.set(0, cabeza.y - 0.14, 2.6);
        cam.lookAt(0, cabeza.y - 0.26, 0);
        ajustar();
        despertar(1500); // deja que el pelo (física del modelo) se acomode
        if (pendiente) void motor.current?.reproducir(...pendiente);
      })
      .catch(() => vivo && callbacks.current.onFalla?.());

    // Bucle de dibujo bajo demanda: corre mientras el avatar hace señas (o se acomoda) y después se detiene.
    // Antes dibujaba 60 veces por segundo siempre, aunque estuviera quieto, y eso ponía lento el computador.
    let corriendo = false;
    let hasta = 0;
    function despertar(ms: number) {
      hasta = Math.max(hasta, performance.now() + ms);
      if (!corriendo && vivo) {
        corriendo = true;
        reloj.getDelta();
        raf = requestAnimationFrame(dibujar);
      }
    }
    const dibujar = () => {
      if (performance.now() > hasta || document.hidden) {
        corriendo = false;
        return;
      }
      raf = requestAnimationFrame(dibujar);
      const dt = Math.min(reloj.getDelta(), 0.1);
      if (vrm && linea) {
        const t = (performance.now() - t0) / 1000;
        const act = linea.items.filter((it) => t >= it.s && t <= it.e);
        const pose = (it: (typeof act)[number]) => muestra(it.c, (t - it.s) / linea!.factor);
        let P = REST;
        if (act.length >= 2) {
          const A = act[act.length - 2]!;
          const B = act[act.length - 1]!;
          const w = ease(Math.min(1, Math.max(0, (t - B.s) / Math.max(1e-6, A.e - B.s))));
          const pb = pose(B);
          P = pose(A).map((q, k) => q.slerp(pb[k]!, w));
        } else if (act.length === 1) P = pose(act[0]!);
        BONES.forEach((b, k) => hueso(b)?.quaternion.copy(P[k]!));
        const f = Math.min(1, t / Math.max(0.001, linea.total));
        const paso = Math.floor(f * 24);
        if (paso !== ultimoPaso) {
          ultimoPaso = paso;
          callbacks.current.onProgreso?.(f);
        }
        const ahora = t < linea.total;
        if (ahora !== senando) {
          senando = ahora;
          callbacks.current.onSenando?.(ahora);
        }
      }
      vrm?.update(dt);
      renderer.render(scene, cam);
    };

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      obs.disconnect();
      motor.current = null;
      // Liberar texturas, geometrías y el contexto WebGL: tras varias llamadas se acumulaban hasta
      // "Too many active WebGL contexts" y el avatar caía al dibujo.
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  // Cada frase nueva: reproducir sus señas.
  useEffect(() => {
    const id = setTimeout(() => motor.current?.reproducir(glosas, FACTOR[velocidad]), 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frase]);

  return <canvas ref={lienzo} className="avatar-vrm" aria-hidden />;
}
