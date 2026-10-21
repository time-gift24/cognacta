import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "vite"

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const manifest = JSON.parse(await readFile(resolve(web, "scripts/beui-catalog.json"), "utf8"))
const input = Object.fromEntries(manifest.files
  .filter(entry => /\.(?:ts|tsx)$/.test(entry.path))
  .map(entry => [entry.path.replace(/\.(?:ts|tsx)$/, ""), resolve(web, entry.installedPath)]))
if (Object.keys(input).length !== 819) throw new Error("beUI catalog must contain all 819 source modules")
await build({
  root: web,
  configFile: resolve(web, "vite.config.ts"),
  build: {
    write: false,
    emptyOutDir: false,
    minify: false,
    reportCompressedSize: false,
    rollupOptions: { input },
  },
})
console.log(`Validated bundling for all ${Object.keys(input).length} beUI source modules`)
