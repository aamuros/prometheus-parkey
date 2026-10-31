import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

// Metro does not resolve GL JS 6's import.meta worker URL. Serve the pinned
// package's unmodified worker and shared module as same-origin static assets.
const source = dirname(fileURLToPath(import.meta.resolve('maplibre-gl')))
const destination = fileURLToPath(
  new URL('../public/maplibre/', import.meta.url),
)
mkdirSync(destination, { recursive: true })
copyFileSync(
  join(source, '..', 'LICENSE.txt'),
  join(destination, 'LICENSE.txt'),
)
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(source, name), join(destination, name))
}
