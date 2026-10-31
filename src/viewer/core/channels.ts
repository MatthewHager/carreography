// Adapted from Tesla Lightshow Studio (github.com/nathanjgrace/tesla-lightshow-studio, AGPL-3.0-only,
// Nathan Grace); modified for Carreography.
// The Tesla light show channel map. Every show file uses this same 200-channel
// layout regardless of vehicle; each car plays the channels it physically has.
// Source: StartChannel values in Tesla's xLights project
// (teslamotors/light-show, xlights/tesla_xlights_show_folder.zip).

import { FALCON_CLOSE_S, FALCON_OPEN_S, LIFTGATE_CLOSE_S, LIFTGATE_OPEN_S, MIRROR_S, PORT_S, WINDOW_S } from '@/engine/motors';

/**
 * How the car interprets a channel's byte value.
 * - boolean: on above 50%, off otherwise
 * - ramping: on/off with optional 500/1000/2000 ms ramps (see encoding.ts)
 * - closure: discrete commands (idle/open/dance/close/stop)
 * - dimmable: any brightness 0-255 (Cybertruck light bars)
 * - rgb: one of three color components of an RGB light
 */
export type ChannelKind = 'boolean' | 'ramping' | 'closure' | 'dimmable' | 'rgb';

export interface ClosureInfo {
  supportsDance: boolean;
  /** Seconds to fully open / close (engine/motors.ts, which the choreography times them by). */
  openSeconds: number;
  closeSeconds: number;
}

export interface ChannelDef {
  /** Stable identifier used throughout the app. */
  id: string;
  /** 0-based index into a frame's channel bytes. */
  index: number;
  kind: ChannelKind;
  closure?: ClosureInfo;
}

const closure = (supportsDance: boolean, openSeconds: number, closeSeconds: number): ClosureInfo =>
  ({ supportsDance, openSeconds, closeSeconds });

const FALCON = closure(true, FALCON_OPEN_S, FALCON_CLOSE_S);
const FRONT_DOOR = closure(false, 22, 3);       // Tesla's README; the choreography doesn't move them
const MIRROR = closure(false, MIRROR_S, MIRROR_S);
const WINDOW = closure(true, WINDOW_S, WINDOW_S);
const LIFTGATE = closure(true, LIFTGATE_OPEN_S.modely!, LIFTGATE_CLOSE_S);
const DOOR_HANDLE = closure(false, 2, 2);
const CHARGE_PORT = closure(true, PORT_S, PORT_S);

// [1-based channel number, id, kind, closure info]
type Row = [number, string, ChannelKind, ClosureInfo?];

const ROWS: Row[] = [
  [1, 'leftOuterMainBeam', 'ramping'],
  [2, 'rightOuterMainBeam', 'ramping'],
  [3, 'leftInnerMainBeam', 'ramping'],
  [4, 'rightInnerMainBeam', 'ramping'],
  [5, 'leftSignature', 'ramping'],
  [6, 'rightSignature', 'ramping'],
  [7, 'leftChannel4', 'ramping'],
  [8, 'rightChannel4', 'ramping'],
  [9, 'leftChannel5', 'ramping'],
  [10, 'rightChannel5', 'ramping'],
  [11, 'leftChannel6', 'ramping'],
  [12, 'rightChannel6', 'ramping'],
  [13, 'leftFrontTurn', 'ramping'],
  [14, 'rightFrontTurn', 'ramping'],
  [15, 'leftFrontFog', 'boolean'],
  [16, 'rightFrontFog', 'boolean'],
  [17, 'leftAuxPark', 'boolean'],
  [18, 'rightAuxPark', 'boolean'],
  [19, 'leftSideMarker', 'boolean'],
  [20, 'rightSideMarker', 'boolean'],
  [21, 'leftSideRepeater', 'boolean'],
  [22, 'rightSideRepeater', 'boolean'],
  [23, 'leftRearTurn', 'boolean'],
  [24, 'rightRearTurn', 'boolean'],
  [25, 'brakeLights', 'boolean'],
  [26, 'leftTail', 'boolean'],
  [27, 'rightTail', 'boolean'],
  [28, 'reverseLights', 'boolean'],
  [29, 'rearFog', 'boolean'],
  [30, 'licensePlate', 'boolean'],
  [31, 'leftFalconDoor', 'closure', FALCON],
  [32, 'rightFalconDoor', 'closure', FALCON],
  [33, 'leftFrontDoor', 'closure', FRONT_DOOR],
  [34, 'rightFrontDoor', 'closure', FRONT_DOOR],
  [35, 'leftMirror', 'closure', MIRROR],
  [36, 'rightMirror', 'closure', MIRROR],
  [37, 'leftFrontWindow', 'closure', WINDOW],
  [38, 'leftRearWindow', 'closure', WINDOW],
  [39, 'rightFrontWindow', 'closure', WINDOW],
  [40, 'rightRearWindow', 'closure', WINDOW],
  [41, 'liftgate', 'closure', LIFTGATE],
  [42, 'leftFrontDoorHandle', 'closure', DOOR_HANDLE],
  [43, 'leftRearDoorHandle', 'closure', DOOR_HANDLE],
  [44, 'rightFrontDoorHandle', 'closure', DOOR_HANDLE],
  [45, 'rightRearDoorHandle', 'closure', DOOR_HANDLE],
  [46, 'chargePort', 'closure', CHARGE_PORT],
];

function rgbRows(start: number, id: string): Row[] {
  return (['Red', 'Green', 'Blue'] as const).map((c, i): Row => [start + i, `${id}${c}`, 'rgb']);
}

function pixelRows(start: number, count: number, id: string): Row[] {
  return Array.from({ length: count }, (_, i): Row => [start + i, `${id}${i + 1}`, 'dimmable']);
}

ROWS.push(
  ...pixelRows(47, 60, 'frontLightBar'),
  ...pixelRows(111, 52, 'rearLightBar'),
  ...pixelRows(167, 6, 'offroadLightBar'),
  ...rgbRows(176, 'centerFrontDisplay'),
  ...rgbRows(179, 'rightRearAccent'),
  ...rgbRows(182, 'rightFrontAccent'),
  ...rgbRows(185, 'centerFrontAccent'),
  ...rgbRows(188, 'leftFrontAccent'),
  ...rgbRows(191, 'leftRearAccent'),
);

export const CHANNELS_BY_ID: ReadonlyMap<string, ChannelDef> = new Map(
  ROWS.map(([num, id, kind, info]) => [id, { id, index: num - 1, kind, ...(info ? { closure: info } : {}) }]),
);

export function channel(id: string): ChannelDef {
  const def = CHANNELS_BY_ID.get(id);
  if (!def) throw new Error(`Unknown channel: ${id}`);
  return def;
}
