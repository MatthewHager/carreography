# The browser app

Carreography in the browser: drop in a song, pick 1 to 5 cars, watch the show on Tesla's own 3D
models, and download each car's `LightShow` folder. Everything runs on the visitor's device; the site
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

## Files that aren't in the repository

- **The analysis models** (`public/models/*.onnx`). `tools/export_models.py` makes them; the site build
  downloads them from the repository's `models` release. For local work, put them in `public/models/`.
- **Tesla's car models.** Visitors add the `.glb` files they extracted themselves, and the browser keeps
  them. While developing, the dev server also serves the copies in `preview3d/public/models/tesla-app/`
  (see `lightshow/tesla_app_models.py`).
- **The Python comparisons** (`cache/bridge/`, from `tools/export_bridge.py`). They describe copyrighted
  recordings, so they stay on your machine. Without them `bridge.test.ts` is skipped. With them, the dev
  server can play a song through the TypeScript choreographer from its Python analysis:
  `http://localhost:5173/carreography/?bridge=02_this_is_halloween`.
