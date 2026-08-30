/**
 * Copies MapLibre's worker into public/ so it can be served at a stable URL.
 *
 * MapLibre 6 no longer inlines its worker. It builds the worker URL at runtime
 * as `new URL(`./${name}`, import.meta.url)` — a dynamic path against a
 * variable base, which no bundler can statically resolve. Once the library is
 * bundled into a Next chunk, that resolves to a file next to the chunk that was
 * never emitted, the request 404s, and because every tile is parsed in the
 * worker the map renders nothing but its background colour.
 *
 * Serving the worker ourselves and pointing `setWorkerUrl` at it (see
 * components/map/live-map.tsx) sidesteps the resolution entirely. The worker
 * imports the shared chunk by relative path, so both files must land in the
 * same directory.
 *
 * Run from `postinstall` and `prebuild` so these copies can never drift from
 * the installed version of the package.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.css"));
const target = join(process.cwd(), "public", "maplibre");

await mkdir(target, { recursive: true });
await Promise.all(FILES.map((file) => copyFile(join(dist, file), join(target, file))));

console.log(`Copied ${FILES.length} MapLibre worker files to public/maplibre/`);
