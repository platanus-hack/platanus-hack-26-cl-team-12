// Baja el modelo del avatar 3D (VRM de muestra de pixiv/three-vrm, 10 MB) a apps/web/public/models/avatar.vrm.
// Corre solo antes de `pnpm dev` y `pnpm build` (hooks predev/prebuild). Si el archivo ya está no hace nada;
// si falla (sin internet, enlace caído) avisa y sigue: la app usa el intérprete dibujado. SKIP_AVATAR=1 lo omite.
// El modelo no se sube a git (ver .gitignore). Mismo archivo que usa lab/v4_avatar/live.
import { existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const URL_MODELO =
  "https://raw.githubusercontent.com/pixiv/three-vrm/dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm";
const destino = resolve(dirname(fileURLToPath(import.meta.url)), "../public/models/avatar.vrm");

async function main() {
  if (process.env.SKIP_AVATAR === "1") return;
  if (existsSync(destino) && statSync(destino).size > 1_000_000) return;
  console.log("[avatar] descargando el modelo 3D (10 MB, una sola vez)…");
  const r = await fetch(URL_MODELO, { signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1_000_000 || buf.toString("latin1", 0, 4) !== "glTF") throw new Error("el archivo no parece un VRM");
  mkdirSync(dirname(destino), { recursive: true });
  const tmp = `${destino}.tmp`;
  writeFileSync(tmp, buf);
  renameSync(tmp, destino); // así nunca queda un archivo a medias
  console.log("[avatar] listo: apps/web/public/models/avatar.vrm");
}

main().catch((e) => console.warn(`[avatar] no se pudo descargar (${e.message}). La app usará el intérprete dibujado.`));
