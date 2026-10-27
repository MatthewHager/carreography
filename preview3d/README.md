# preview3d: the 3D preview

A browser 3D preview of a lineup of 1 to 5 cars (left to right facing the crowd, a shallow V with the
centre car forward), each car driven by its own `.fseq`, in sync with the show's `.wav`. The cars are
Tesla's own models and animations, from the Tesla app.

## The car models (install once)

The viewer draws only Tesla's official models: the 2025+ Model Y, the 2020-24 Model Y and the
Cybertruck from the Tesla app, with Tesla's own animations for the frunk, liftgate, windows, mirrors
and charge port. They're Tesla's, so they aren't in the repository. With an app bundle
(.apkm/.apks/.xapk/.apk, from your Android phone or an APK mirror) and
[tesla-model-extractor](https://github.com/koenhendriks/tesla-model-extractor) installed:

```bash
python3 -m lightshow.tesla_app_models ~/Downloads/Tesla_4.61.6-4647.apkm
```

That writes `public/models/tesla-app/` and `dist/models/tesla-app/`. Until they're there, the viewer
says which models are missing and how to get them.

## Open it

With `python3 -m http.server 8765 --bind 0.0.0.0` running at the project root:

- this Mac: <http://localhost:8765/preview3d/dist/>
- iPad on the same Wi-Fi: `http://<this Mac's IP>:8765/preview3d/dist/` (tap **Play** to start the audio)

URL options: `?manifest=<url of a shows.json>` (a build's own show list, e.g. from `build.py --out` or
the web app; paths in it are relative to it), `?show=02_this_is_halloween`, `&t=36` (start time, s),
`&cam=Front|Rear|3/4|Top`, `&labels=1`, `&ybody=mesh` (Model Ys the show doesn't name: 2020-24).
Keys: space play/pause, left/right arrows seek 5 s (shift: 1 s).

## What it does

- Shows come from `../preview/shows.json` (or `?manifest=`); each car's model comes from its `body`
  field there (`modely2025`, `modely2020`, `cybertruck`), and each car's `.fseq` is read and run
  through the channel profiles and simulation adapted from Tesla Lightshow Studio: Tesla's light ramps
  (500/1000/2000 ms), OR'd outputs (the 2025+ Model Y's bar sections, the 2020-24 Model Y's
  channels 4-6), Cybertruck remapped channels, dimmable light bars.
- Closures play the app's own animation clips at the closure's position, moving at the travel times
  (liftgate 14 s and the Cybertruck frunk 10 s to open, 4 s to close; windows 4 s; mirrors 2 s; charge
  port 2 s). **Stop** freezes them where they are, **Dance** oscillates between two positions (a
  lowered window dances back up a little). Mirrors start unfolded (Close folds them). The app doesn't
  animate the 2025+ Model Y's mirrors, so `appBody.ts` cuts them out of the door meshes and folds them
  back about their base.
- Lamps: the app keeps each kind of lamp in one mesh, so `appBody.ts` splits them by position into the
  show's channels - per side, inner and outer beams, the 2025+ Model Y's three bar sections (outer
  ends on channel 4, centre on channel 6, as owners' on-car tests found), the Cybertruck's 60- and
  52-LED bars LED by LED.
- Lights: emissive lamp materials, an additive glow sprite per lamp section and per LED (one draw call
  for all of them), light pools on the ground for headlights, tails and reverse lights, and gentle
  UnrealBloom. Interior RGB (1-based channels 176-193) glows inside the cabin.
- iPad: devicePixelRatio capped at 1.5, no real-time lights from the cars (pools are textures); if the
  first seconds of playback run below ~28 fps, bloom switches itself off.
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
  profiles, `simulate.ts`.
- `src/car/`: `appBody.ts` (Tesla's app models: loading, lamps by channel, closures, mirror folding),
  `builder.ts` (what a body registers with its rig), `kit.ts` (lens colours, contact shadow), `lot.ts`
  (the parking lot, from the studio).
- `src/rig.ts` one car (lights, LED bars, closures, glows, pools, cabin), `src/glow.ts` glow sprites,
  `src/viewer.ts` scene/camera/bloom/lineup, `src/main.ts` UI and audio sync.

Changes to the studio code: `simulate.ts` lets lowered windows dance; `lot.ts` puts the lineup in a
driving aisle, paints the lamp-pole light into the asphalt instead of real lights, and makes the
wet-ground mirror optional; the renderer/light wiring of the studio's `CarScene.ts` is reworked into
`rig.ts` and `viewer.ts` for a lineup.

## Credits and license

- Based on **Tesla Lightshow Studio** by Nathan Grace,
  <https://github.com/nathanjgrace/tesla-lightshow-studio>, licensed **AGPL-3.0-only**. Its core
  (`src/core`) and scene code are copied and adapted here, so this folder is AGPL-3.0-only as well; the
  full license text is in [`LICENSE`](LICENSE). If you host this viewer for others, offer them this
  source.
- The car models and animations are **Tesla's**, from the Tesla app, extracted on your machine with
  [tesla-model-extractor](https://github.com/koenhendriks/tesla-model-extractor) (MIT); not
  redistributed here.
- three.js (MIT) for rendering.
