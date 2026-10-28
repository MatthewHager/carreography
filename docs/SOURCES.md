# Sources and credits

## What the app is built on

| What | Used for | Licence |
|---|---|---|
| [Beat This!](https://github.com/CPJKU/beat_this) (Foscarin, Schlüter and Widmer, ISMIR 2024), the `final0` checkpoint | beats and downbeats | MIT |
| [basic-pitch](https://github.com/spotify/basic-pitch) (Spotify), its `nmp.onnx` | note transcription | Apache-2.0 |
| [ONNX Runtime Web](https://onnxruntime.ai/) | running both models in the browser | MIT |
| [librosa](https://librosa.org/) | the analysis is a TypeScript port of the parts it uses | ISC |
| [numpy](https://numpy.org/) | its rounding, quantiles and random generator, ported where they decide a frame | BSD-3-Clause |
| [LRCLIB](https://lrclib.net) | synced lyrics, looked up by artist, title and length | free API |
| [Tesla Lightshow Studio](https://github.com/nathanjgrace/tesla-lightshow-studio) by Nathan Grace | the 3D preview (below) | AGPL-3.0-only |
| [three.js](https://threejs.org/) | the 3D preview | MIT |
| [React](https://react.dev/), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/) | the page | MIT |
| [shadcn/ui](https://ui.shadcn.com/) with [Radix](https://www.radix-ui.com/), [vaul](https://github.com/emilkowalski/vaul), [sonner](https://github.com/emilkowalski/sonner) | the controls | MIT |
| [Lucide](https://lucide.dev/) | icons | ISC |
| [Geist](https://vercel.com/font) | the typeface | OFL-1.1 |

The models are exported for the browser by `tools/export_models.py`.

## Tesla

- **Tesla's light show documentation**, [teslamotors/light-show](https://github.com/teslamotors/light-show):
  the FSEQ format, the 200-channel map, which lamps each car has, the motor commands and their per-show
  limits. Its multi-car examples ("The Arrival", five cars; "Cyber Symphony", four) were studied for the
  move vocabulary.
- **Tesla's car models and paint table**, from the Tesla Android app, extracted with
  [tesla-model-extractor](https://github.com/koenhendriks/tesla-model-extractor) by Koen Hendriks (MIT)
  by `tools/export_car_models.py`. They're Tesla's property, not covered by this project's licence. They
  never enter the git history; the site hosts them for the preview, from a release.
- **The 2025+ Model Y's lamps**, which Tesla hasn't documented: on-car tests in teslamotors/light-show
  issue #183 and [Nghtmare7509/tesla-lightshow-juniper](https://github.com/Nghtmare7509/tesla-lightshow-juniper).

Carreography is not affiliated with Tesla.

## The 3D preview

`src/viewer/` is adapted from Tesla Lightshow Studio (AGPL-3.0-only), so the whole project is
AGPL-3.0. From the studio: `core/` (the FSEQ writer, the channel map, the byte encodings, the vehicle
profiles and the simulation) and the scene code of its `CarScene.ts`, reworked into `rig.ts` and
`viewer.ts` for a lineup, and the parking lot (`car/lot.ts`). Changes: lowered windows can dance, the
lineup stands in a driving aisle, the lamp poles' light is painted into the asphalt instead of real
lights, and the wet-ground mirror is optional. The cars themselves are Tesla's models (above).

## Recordings

The shows were tuned on the twelve songs of a Halloween 2026 show for two Model Ys and a Cybertruck. They
are not in the repository; several are commercial recordings. A file named as below gets that song's own
cue sheet (`src/engine/cues.ts`).

| File name | Piece | Recording | Source |
|---|---|---|---|

## Study material

The move vocabulary and timing rules drew on other people's shows, studied locally and not redistributed
(none declare a licence): Tesla's examples (above); community shows from
[TeslaLightShare](https://teslalightshare.io); and on GitHub c0lt/also-sprach-zarathustra,
codykingllamas/halloween-kills, codykingllamas/haunted-mansion-stretch-room,
codykingllamas/sugar-plum-fairy, quaternionmedia/toccata-fugue-xlights and rutgersmike/tom-devil.
Visualizers and editors looked at while building the preview: GigaJunky/TeslaLightShowPlayer,
HLVM04/Tesla-Beat-Mapper, Martelinok/TeslaShowSimulator, ak463010/fseq-visualizer,
guillaumebdx/tesla-lightshow-mobile, jreznik/tesla-lightshow-visualizer, recallfx/tesla-light-show-editor,
tbatch-ohanafy/tesla-lightshow-creator and wmorrill3/lightcue.
