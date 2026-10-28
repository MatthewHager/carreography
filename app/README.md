# The browser app

Carreography in the browser: drop in a song, pick 1 to 5 cars, watch the show on Tesla's own 3D
models, and download each car's `LightShow` folder. Everything runs on the visitor's device, except that
the song's artist, title and length are sent to [LRCLIB](https://lrclib.net) to find its lyrics. The site
is static and hosted on GitHub Pages ([matthewhager.github.io/carreography](https://matthewhager.github.io/carreography/)).
The plan behind it is [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

```bash
npm install
npm run dev          # http://localhost:5173/carreography/
npx vitest run       # the tests
npm run build        # the site, in dist/
```

## Where things are

| Folder | What |
|---|---|
| `src/engine/` | The choreographer: no DOM, runs in a worker, in Node for the tests. A line-by-line port of the Python `lightshow/` package (same module names), checked against it byte for byte (`bridge.test.ts`). |
| `src/engine/listen/` | The listening side: decoding helpers, the librosa subset, beat-this and basic-pitch on ONNX Runtime Web. |
| `src/viewer/` | The 3D preview (three.js), adapted from Tesla Lightshow Studio (AGPL-3.0). |
| `src/app/` | The page: the 3D stage, the panels, the worker that makes a show, the download. |
| `src/components/ui/` | shadcn/ui components, as the shadcn CLI writes them. Don't edit; restyle through the theme in `src/index.css`. |

## Browsers

The listening models run on the best backend the browser has, and fall back by themselves
(`src/engine/listen/infer.ts`): WebGPU, else a pool of WASM workers, else one WASM session in the show's
worker. A GPU that fails at run time, or pool workers that can't start or die, drop to the next one and
start over. The pool is sized by memory as well as cores, since each worker takes about 1 GB at its peak:
one worker per 4 GB of `deviceMemory` (Chromium), two on other computers, none on phones and tablets.

Checked on the built site, served statically under `/carreography/` like GitHub Pages, with Playwright
on an M1 Max: Hall of the Mountain King (2:34, WAV) for three cars, from "Make the show" to the finished
show, and the peak memory of the busiest browser process. Every run played and downloaded a valid ZIP
(PSEQ, 200 channels, 20 ms, and the song's own samples):

| Browser | WebGPU | Pool | One thread |
|---|---|---|---|
| Chromium 156 | 10.7 s, 1.3 GB | 20.0 s (4 workers), 6.1 GB | 38.0 s, 1.8 GB |
| Firefox 157 | no adapter | 26.7 s (2 workers), 2.6 GB | 42.8 s, 1.8 GB |
| WebKit 27.2 (Safari) | 15.8 s, 2.1 GB | 24.3 s (2 workers), 3.8 GB | 40.4 s, 2.6 GB |
| WebKit as iPad Pro 11 | 15.1 s, 2.2 GB | none on tablets | 36.5 s, 2.6 GB |
| WebKit as iPhone 17 | 11.5 s, 2.5 GB | none on phones | 37.1 s, 2.5 GB |

| Forced failure | Chromium | Firefox | WebKit |
|---|---|---|---|
| WebGPU device refused: pool | 24.9 s | | 27.5 s |
| WebGPU device lost mid-run: pool | 22.0 s | | 33.2 s |
| A pool worker dies mid-run: one thread | 43.3 s | 48.1 s | 45.7 s |

Danse Macabre (6:46) takes 19 s in Chromium and 26 s in WebKit on WebGPU, 55 s in Firefox's pool. A
second show takes about half as long on WebGPU (the worker and its sessions are kept). MP3 and FLAC
were checked in all three too.

- **Safari** crashed the page a few seconds after a worker that had used WebGPU was terminated, even with
  its device destroyed. The show worker that used WebGPU is therefore kept, and makes the next show too.
- **Firefox** has `navigator.gpu` but gives no adapter on macOS, so it uses the pool.
- **iPhone and iPad** were emulated with WebKit's device profiles, which can't show a real device's memory
  limit or frame rate. Safari 26 has WebGPU, so they use it; older ones listen on one thread (about 1 GB at
  its peak). Touch orbits and pinch-zooms the stage without scrolling the page.
- **The same show everywhere**: a 44.1 kHz WAV is read by the app itself, since browsers scale 16-bit
  samples differently. Hall of the Mountain King's files are then byte-identical in every browser and on
  every backend; Danse Macabre's are too, except 6 bytes of the Cybertruck's in Firefox (one brightness
  level on a light-bar pixel). Other formats go through the browser's own decoder, so an MP3's or FLAC's
  show can differ a little from browser to browser.

## Files that aren't in the repository

- **The analysis models** (`public/models/*.onnx`). `tools/export_models.py` makes them; the site build
  downloads them from the repository's `models` release. For local work, put them in `public/models/`.
- **Tesla's car models and paints.** Visitors add the `.glb` files they extracted themselves, and the
  app's paint table (`paints.json`, the same next to every model), and the browser keeps them. While
  developing, the dev server also serves the copies in `preview3d/public/models/tesla-app/` (see
  `lightshow/tesla_app_models.py`). Without the paint table every car keeps its model's own paint.
- **The Python comparisons** (`cache/bridge/`, from `tools/export_bridge.py`). They describe copyrighted
  recordings, so they stay on your machine. Without them `bridge.test.ts` is skipped. With them, the dev
  server can play a song through the TypeScript choreographer from its Python analysis:
  `http://localhost:5173/carreography/?bridge=02_this_is_halloween`.
