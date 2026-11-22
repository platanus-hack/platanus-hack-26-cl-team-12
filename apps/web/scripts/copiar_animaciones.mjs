// Copia las animaciones del avatar 3D (data/signs/anim/*.json, las graba y procesa Tomás, v4) a public/anim/
// y escribe public/anim/index.json con la lista. Corre antes de `pnpm dev` y `pnpm build` (predev/prebuild).
// public/anim/ no se versiona: la fuente única es data/signs/anim/.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = resolve(aqui, "../../../data/signs/anim");
const destino = resolve(aqui, "../public/anim");

if (!existsSync(origen)) {
  console.warn("[animaciones] no está data/signs/anim: el avatar 3D quedará en reposo.");
} else {
  mkdirSync(destino, { recursive: true });
  const ids = readdirSync(origen)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      copyFileSync(resolve(origen, f), resolve(destino, f));
      return f.replace(/\.json$/, "");
    })
    .sort();
  writeFileSync(resolve(destino, "index.json"), JSON.stringify(ids));
  console.log(`[animaciones] ${ids.length} señas copiadas a public/anim/`);
}
