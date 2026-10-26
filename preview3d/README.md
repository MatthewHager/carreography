# preview3d: 3D viewer for the three-car shows

A browser 3D preview of the lineup, **Model Y | Cybertruck | Model Y** (left to right facing the crowd,
shallow V, centre car about 1 m forward), each car driven by its own `.fseq`, in sync with the show's `.wav`.

Open (with `python3 -m http.server 8765 --bind 0.0.0.0` running at the project root):

- this Mac: <http://localhost:8765/preview3d/dist/>
- iPad on the same Wi-Fi: `http://<this Mac's IP>:8765/preview3d/dist/` (tap **Play** to start the audio)

URL options: `?show=02_this_is_halloween`, `&t=36` (start time, s), `&cam=Front|Rear|3/4|Top`,
`&bloom=0`, `&ybody=refresh`. Keys: space play/pause, left/right arrows seek 5 s (shift: 1 s).

## What it does

- Shows come from `../preview/shows.json`; each car's `.fseq` is read and run through the channel
  profiles and simulation adapted from Tesla Lightshow Studio: Tesla's light ramps (500/1000/2000 ms),
  OR'd outputs (Model Y channels 4-6 share one lamp per side; side markers and aux park share one output),
  Cybertruck remapped channels, dimmable light bars.
- Closures move at the travel times (liftgate/frunk 14 s open, 4 s close; windows 4 s; mirrors 2 s;
  charge port 2 s), **Stop** freezes them where they are, **Dance** oscillates between two positions
  (a lowered window dances back up a little). Mirrors start unfolded (Close folds them).
- Cybertruck: frunk lid, windows, mirrors and charge port are cut out of Tesla's one-piece body by region
  and hinged; the 60-LED front bar is built from its lens triangles and rides on the frunk lid (hinge at
  the base of the windshield); the 52-LED rear bar too. Every LED is lit separately.
- Model Y: Tesla's Model S mesh reshaped to Model Y dimensions (Tesla publishes no Model Y), with every
  lamp split per channel from Tesla's xLights layout. The selector **Model Y: 2025 (simple)** switches to
  the studio's code-built 2025+ Model Y with light bars (front bar follows the signature channels, rear
  bar the tails; unverified on the real car).
- Lights: emissive lamp materials, an additive glow sprite per lamp section and per LED (one draw call
  for all of them), light pools on the ground for headlights, fogs, tails and reverse lights, and gentle
  UnrealBloom. Interior RGB (1-based channels 176-193) lights the cabin through the glass.
- iPad: devicePixelRatio capped at 1.5, no real-time lights from the cars (pools are textures), about
  200 draw calls; if the first seconds of playback run below ~28 fps, bloom switches itself off.
- Audio is downloaded whole and played from a blob URL, because `http.server` doesn't answer range
  requests (which Safari needs for seeking). Time follows `audio.currentTime`.

## Rebuild

```bash
cd preview3d
npm install
npm run build      # type-checks, then writes dist/
```

(`npm run dev` serves the app for editing, but shows load from `../../` relative to the page, so use
the built `dist/` through the project-root server.)

## Layout

- `src/core/` (from the studio): `fseq.ts` reader, `channels.ts`, `encoding.ts`, `vehicles.ts`
  profiles, `simulate.ts`, `xlightsLayout.ts`.
- `src/car/` (from the studio): `meshBody.ts` (Tesla mesh to per-channel lamps and hinged parts),
  `derive.ts` (S to Y reshape), `bodies.ts`/`parts.ts`/`kit.ts` (code-built bodies), `lot.ts`
  (parking lot), `teslaAssets.ts` (loads `public/models/`), `builder.ts` (shared types).
- `src/rig.ts` one car (lights, LED bars, closures, glows, pools, cabin), `src/glow.ts` glow sprites,
  `src/viewer.ts` scene/camera/bloom/lineup, `src/main.ts` UI and audio sync.
- `public/models/`: Tesla's `Cybertruck/` and `Model_S/` OBJ + textures and `xlights_rgbeffects.xml`,
  copied from `vendor/xl/tesla_xlights_show_folder/`.

Changes to the studio code: `simulate.ts` lets lowered windows dance; `meshBody.ts` puts the front bar
on the frunk lid and adds a charge-port LED; `lot.ts` puts the lineup in a driving aisle, paints the
lamp-pole light into the asphalt instead of real lights, and makes the wet-ground mirror optional; the
renderer/light wiring of the studio's `CarScene.ts` is reworked into `rig.ts` and `viewer.ts` for three cars.

## Credits and license

- Based on **Tesla Lightshow Studio** by Nathan Grace,
  <https://github.com/nathanjgrace/tesla-lightshow-studio>, licensed **AGPL-3.0-only**. Its core
  (`src/core`) and car-building code (`src/app/car`) are copied and adapted here, so this folder is
  AGPL-3.0-only as well; the full license text is in [`LICENSE`](LICENSE). If you host this viewer for
  others, offer them this source.
- 3D models, textures and the xLights layout are **Tesla's**, from
  <https://github.com/teslamotors/light-show> (`xlights/tesla_xlights_show_folder`), published without
  a license: fine for personal use, do not redistribute.
- three.js (MIT) for rendering.
