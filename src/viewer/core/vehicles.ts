// Adapted from Tesla Lightshow Studio (github.com/nathanjgrace/tesla-lightshow-studio, AGPL-3.0-only,
// Nathan Grace); modified for Carreography.
// Vehicle capability profiles: which channels a car physically has and how it
// treats them. The show file is the same for every car; a profile shapes what
// the preview draws of it.
//
// Sources: Tesla's README tables (github.com/teslamotors/light-show) unless a channel's `maybe` note
// says otherwise. Variants after Tesla's last README update (Dec 2024), like the 2025 Model Y, are
// marked unverified.

import { LIFTGATE_CLOSE_S, LIFTGATE_OPEN_S } from '@/engine/motors';
import type { AppModelId } from '@/engine/vehicles';
import { CHANNELS_BY_ID, type ChannelKind } from './channels';

type ChannelGroup = 'front' | 'rear' | 'closures' | 'interior';

interface ProfileChannel {
  id: string;
  group: ChannelGroup;
  /** How this car treats the channel, when it differs from the channel map. */
  kind: ChannelKind;
  /** What the channel drives on this car, when it isn't the channel's own name. */
  label?: string;
  /** Present only on some cars of this variant (region, options), or unverified. */
  maybe?: string;
}

/**
 * Several channels driving one physical light: the light is on when any
 * input is on, and every output shows that combined state.
 */
interface OrGroup {
  inputs: string[];
  outputs: string[];
}

export interface VehicleProfile {
  id: string;
  channels: ProfileChannel[];
  /** Channels 5 and 6 take their ramp time from channel 4 on the same side. */
  channel4LeadsRamps: boolean;
  orGroups: OrGroup[];
  /** Travel times that differ from Tesla's per-channel figures: id -> [open s, close s]. */
  closureSeconds?: Record<string, [number, number]>;
}

type Row = [id: string, group: ChannelGroup, extra?: Partial<Omit<ProfileChannel, 'id' | 'group'>>];

function profile(p: Omit<VehicleProfile, 'channels'> & { rows: Row[] }): VehicleProfile {
  const { rows, ...rest } = p;
  return {
    ...rest,
    channels: rows.map(([id, group, extra]) => {
      const def = CHANNELS_BY_ID.get(id);
      if (!def) throw new Error(`Unknown channel in ${p.id} profile: ${id}`);
      return { id, group, kind: def.kind, ...extra };
    }),
  };
}

const sides = (base: string, group: ChannelGroup, extra?: Row[2]): Row[] => [
  [`left${base}`, group, extra],
  [`right${base}`, group, extra],
];

const NA_ONLY = 'North America only';
const NON_NA = 'Outside North America only';

const centerDisplay = (maybe?: string): Row[] =>
  (['Red', 'Green', 'Blue'] as const).map((c): Row => [`centerFrontDisplay${c}`, 'interior', maybe ? { maybe } : {}]);

const accentLights: Row[] = ['rightRearAccent', 'rightFrontAccent', 'centerFrontAccent', 'leftFrontAccent', 'leftRearAccent'].flatMap(
  (base) => (['Red', 'Green', 'Blue'] as const).map((c): Row => [`${base}${c}`, 'interior']),
);

// --- Model S and X (2021+): share the front lighting layout -------------------

const sxFront = (): Row[] => [
  // Outer main beams ramp on LED reflector headlights but are on/off on
  // projector headlights; which builds have which isn't documented.
  ...sides('OuterMainBeam', 'front', { maybe: 'Ramps on reflector headlights only' }),
  ...sides('InnerMainBeam', 'front'),
  ...sides('Signature', 'front', { kind: 'boolean' }),
  ...sides('Channel4', 'front'),
  ...sides('Channel5', 'front'),
  ...sides('Channel6', 'front'),
  ...sides('FrontTurn', 'front', { kind: 'boolean' }),
  ...sides('FrontFog', 'front'),
  ...sides('AuxPark', 'front'),
  ...sides('SideMarker', 'front', { maybe: NA_ONLY }),
  ...sides('SideRepeater', 'front'),
];

const commonRear = (rearFog: string | undefined): Row[] => [
  ...sides('RearTurn', 'rear'),
  ['brakeLights', 'rear'],
  ...sides('Tail', 'rear'),
  ['reverseLights', 'rear'],
  ['rearFog', 'rear', rearFog ? { maybe: rearFog } : {}],
  ['licensePlate', 'rear'],
];

const commonClosures = (liftgate?: string): Row[] => [
  ...sides('Mirror', 'closures'),
  ['leftFrontWindow', 'closures'],
  ['leftRearWindow', 'closures'],
  ['rightFrontWindow', 'closures'],
  ['rightRearWindow', 'closures'],
  ['liftgate', 'closures', liftgate ? { maybe: liftgate } : {}],
  ['chargePort', 'closures'],
];

export const MODEL_S_2021 = profile({
  id: 'modelS-2021',
  channel4LeadsRamps: true,
  // Model S: aux park and side markers work together, per side.
  orGroups: [
    { inputs: ['leftSideMarker', 'leftAuxPark'], outputs: ['leftSideMarker', 'leftAuxPark'] },
    { inputs: ['rightSideMarker', 'rightAuxPark'], outputs: ['rightSideMarker', 'rightAuxPark'] },
  ],
  rows: [
    ...sxFront(),
    ...commonRear(NON_NA),
    ['leftFrontDoorHandle', 'closures'],
    ['leftRearDoorHandle', 'closures'],
    ['rightFrontDoorHandle', 'closures'],
    ['rightRearDoorHandle', 'closures'],
    ...commonClosures(),
    ...centerDisplay(),
  ],
});

export const MODEL_X_2021 = profile({
  id: 'modelX-2021',
  channel4LeadsRamps: true,
  orGroups: [],
  rows: [
    ...sxFront(),
    // North America Model X has rear fogs; elsewhere all cars do.
    ...commonRear(undefined),
    ...sides('FalconDoor', 'closures'),
    ...sides('FrontDoor', 'closures'),
    ...commonClosures(),
    ...centerDisplay('Unverified on Model X'),
  ],
});

// --- Model 3 and Y -------------------------------------------------------------

const threeYFront = (fogs: string | undefined): Row[] => [
  ...sides('OuterMainBeam', 'front', { maybe: 'Ramps on reflector headlights only' }),
  ...sides('InnerMainBeam', 'front'),
  ...sides('Signature', 'front'),
  ...sides('Channel4', 'front'),
  ...sides('Channel5', 'front'),
  ...sides('Channel6', 'front'),
  ...sides('FrontTurn', 'front'),
  ...sides('FrontFog', 'front', fogs ? { maybe: fogs } : {}),
  ...sides('AuxPark', 'front', fogs ? { maybe: fogs } : {}),
  ...sides('SideMarker', 'front', { maybe: NA_ONLY }),
  ...sides('SideRepeater', 'front'),
];

const threeYOrGroups = (): OrGroup[] => [
  // Channels 4-6 are one physical light per side.
  { inputs: ['leftChannel4', 'leftChannel5', 'leftChannel6'], outputs: ['leftChannel4', 'leftChannel5', 'leftChannel6'] },
  { inputs: ['rightChannel4', 'rightChannel5', 'rightChannel6'], outputs: ['rightChannel4', 'rightChannel5', 'rightChannel6'] },
  // All aux park lights and side markers operate together.
  {
    inputs: ['leftSideMarker', 'leftAuxPark', 'rightSideMarker', 'rightAuxPark'],
    outputs: ['leftSideMarker', 'leftAuxPark', 'rightSideMarker', 'rightAuxPark'],
  },
];

const SR_PLUS = 'Not on Standard Range Plus';
const FOGS_2024 = 'Reportedly not fitted on 2024+ Model 3 (unverified)';

export const MODEL_3_2020 = profile({
  id: 'model3-2020',
  channel4LeadsRamps: true,
  orGroups: threeYOrGroups(),
  rows: [...threeYFront(SR_PLUS), ...commonRear(NON_NA), ...commonClosures('Only with a power trunk'), ...centerDisplay()],
});

export const MODEL_3_2024 = profile({
  id: 'model3-2024',
  channel4LeadsRamps: true,
  orGroups: threeYOrGroups(),
  rows: [
    ...threeYFront(FOGS_2024),
    ...commonRear(NON_NA),
    ...commonClosures('Only with a power trunk'),
    ...centerDisplay(),
    ...accentLights,
  ],
});

export const MODEL_Y_2020 = profile({
  id: 'modelY-2020',
  channel4LeadsRamps: true,
  orGroups: threeYOrGroups(),
  rows: [...threeYFront(undefined), ...commonRear(NON_NA), ...commonClosures('Only with a power liftgate'), ...centerDisplay()],
});

const lightBar = (base: string, count: number, maybe?: string): Row[] =>
  Array.from({ length: count }, (_, i): Row => [`${base}${i + 1}`, 'front', maybe ? { maybe } : {}]);

// The 2025+ Model Y ("Juniper") came out after Tesla's last light show
// documentation update. The community reports its front light bar as 60 LEDs on
// the Cybertruck's front-bar channels (light-show issues #144/#166), while an
// on-car test (#183) found channel 6 drives the whole bar and channel 4 the
// outer strips. The preview draws the pixel bar; the show generator writes both.
const Y_2025 = 'Unverified on 2025+ Model Y';

// On-car tests of the light-bar Model Y (Oct 2026: light-show issue #183 and
// github.com/Nghtmare7509/tesla-lightshow-juniper) found signature, channel 5, fogs,
// aux park and side markers do nothing; channel 4 lights each outer end of the
// front bar and channel 6 (either side) its whole centre.
const JUNIPER_DEAD = /(Signature|Channel5|FrontFog|AuxPark|SideMarker)$/;

const y2025Front = (lightBar: boolean): Row[] =>
  threeYFront(undefined)
    .filter(([id]) => !(lightBar && JUNIPER_DEAD.test(id)))
    .map(([id, group, extra]): Row => [id, group, { maybe: Y_2025, ...extra }]);

/** Channel 4 -> the bar's outer ends, channel 6 -> its centre; nothing in the headlights. */
const juniperOrGroups = (): OrGroup[] => [
  { inputs: ['leftChannel4'], outputs: ['barLeftEnd'] },
  { inputs: ['rightChannel4'], outputs: ['barRightEnd'] },
  { inputs: ['leftChannel6', 'rightChannel6'], outputs: ['barCentre'] },
  { inputs: [], outputs: ['leftChannel4', 'rightChannel4', 'leftChannel6', 'rightChannel6'] },
];

export const MODEL_Y_2025 = profile({
  id: 'modelY-2025',
  channel4LeadsRamps: true,
  orGroups: juniperOrGroups(),
  rows: [
    ...y2025Front(true),
    // Tested on the car: no rear fog on North American cars; "Brake" is the rear bar.
    ...commonRear(NON_NA)
      .filter(([id]) => id !== 'rearFog')
      .map(([id, group, extra]): Row => (id === 'brakeLights' ? [id, group, { ...extra, label: 'Rear light bar (Brake)' }] : [id, group, extra])),
    ...commonClosures('Only with a power liftgate'),
    ...centerDisplay(),
    ...accentLights,
  ],
});

// The Model Y L (six seats, a longer body) has the 2025+ Model Y's front and rear light bars; no
// light show test of it is known, so it takes the light-bar Model Y's map.
export const MODEL_Y_L: VehicleProfile = { ...MODEL_Y_2025, id: 'modelY-L' };

export const MODEL_Y_STANDARD = profile({
  id: 'modelY-2026-standard',
  channel4LeadsRamps: true,
  orGroups: threeYOrGroups(),
  rows: [...y2025Front(false), ...commonRear(NON_NA), ...commonClosures('Only with a power liftgate'), ...centerDisplay()],
});

// --- Cybertruck ------------------------------------------------------------------
// Several channels drive different lights than their names suggest
// (README "Cybertruck Light Remapping").

export const CYBERTRUCK_2024 = profile({
  id: 'cybertruck-2024',
  channel4LeadsRamps: false,
  // The frunk (liftgate channel), timed on a 2024 Cybertruck.
  closureSeconds: { liftgate: [LIFTGATE_OPEN_S.cybertruck!, LIFTGATE_CLOSE_S] },
  orGroups: [],
  rows: [
    ...sides('OuterMainBeam', 'front'),
    ...sides('InnerMainBeam', 'front'),
    ...sides('FrontTurn', 'front'),
    ...sides('SideMarker', 'front', { kind: 'ramping' }),
    ...lightBar('frontLightBar', 60),
    ...lightBar('offroadLightBar', 6, 'Optional upgrade'),
    ['leftAuxPark', 'front', { label: 'Frunk Light' }],
    ...lightBar('rearLightBar', 52).map(([id, , extra]): Row => [id, 'rear', extra]),
    ['brakeLights', 'rear', { kind: 'dimmable' }],
    ['leftTail', 'rear', { label: 'Left Reverse Light' }],
    ['rightTail', 'rear', { label: 'Right Reverse Light' }],
    ['leftSideRepeater', 'rear', { label: 'Left Rear Side Marker' }],
    ['rightSideRepeater', 'rear', { label: 'Right Rear Side Marker' }],
    ['reverseLights', 'rear', { label: 'Bed Lights' }],
    ['licensePlate', 'rear'],
    ...sides('Mirror', 'closures'),
    ['leftFrontWindow', 'closures'],
    ['leftRearWindow', 'closures'],
    ['rightFrontWindow', 'closures'],
    ['rightRearWindow', 'closures'],
    ['liftgate', 'closures', { label: 'Powered Frunk' }],
    ['chargePort', 'closures'],
    ...centerDisplay(),
    ...accentLights,
  ],
});

/** Which channels each app model's car has, and how it treats them (core/vehicles.ts). */
export const PROFILES: Record<AppModelId, VehicleProfile> = {
  s_palladium: MODEL_S_2021,
  model3_high: MODEL_3_2020,
  poppyseed: MODEL_3_2024,
  x_palladium: MODEL_X_2021,
  y_high: MODEL_Y_2020,
  bayberry: MODEL_Y_2025,
  bayberry_e41: MODEL_Y_STANDARD,
  bayberry_e80: MODEL_Y_L,
  cybertruck: CYBERTRUCK_2024,
};
