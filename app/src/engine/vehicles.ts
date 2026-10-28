// The lineup: which cars, in which order, as the crowd sees them (crowd's left to right).
//
// A lineup is a string of 1 to 5 letters, one per car:
//   Y   Model Y, 2025 and later (a light bar across the nose)
//   y   Model Y, 2020-2024
//   C   Cybertruck
// e.g. "YCY" is Model Y | Cybertruck | Model Y. Every car gets its own show file, named after its
// place in the line (Car2_Cybertruck_Center).

export const MAX_CARS = 5;

export interface Vehicle {
  letter: string;
  kind: 'modely' | 'cybertruck'; // the choreographer's body type
  model: string;                 // used in folder names
  label: string;                 // for people
  juniper: boolean;              // 2025+ Model Y lamp map (lamps.ts)
  body: string;                  // the 3D viewer's body
}

export const VEHICLES: Record<string, Vehicle> = {
  Y: { letter: 'Y', kind: 'modely', model: 'ModelY', label: 'Model Y (2025+)', juniper: true, body: 'modely2025' },
  y: { letter: 'y', kind: 'modely', model: 'ModelY', label: 'Model Y (2020-2024)', juniper: false, body: 'modely2020' },
  C: { letter: 'C', kind: 'cybertruck', model: 'Cybertruck', label: 'Cybertruck', juniper: false, body: 'cybertruck' },
};

/** Place names by lineup length, crowd's left to right. */
export const PLACES: Record<number, string[]> = {
  1: ['Solo'],
  2: ['Left', 'Right'],
  3: ['Left', 'Center', 'Right'],
  4: ['Left', 'CenterLeft', 'CenterRight', 'Right'],
  5: ['Left', 'CenterLeft', 'Center', 'CenterRight', 'Right'],
};

/** The lineup string, checked; throws an Error with a message for people. */
export function parseLineup(text: string): string {
  const s = (text || '').trim();
  if (s.length < 1 || s.length > MAX_CARS) throw new Error(`a lineup is 1 to ${MAX_CARS} cars, e.g. YCY (got ${JSON.stringify(text)})`);
  const bad = [...new Set(s)].filter((ch) => !VEHICLES[ch]).sort();
  if (bad.length) {
    const known = Object.values(VEHICLES).map((v) => `${v.letter} = ${v.label}`).join(', ');
    throw new Error(`unknown car letter(s) ${bad.join(', ')}: use ${known}`);
  }
  return s;
}

/** [folder name, vehicle, place] crowd's left to right, e.g. ["Car1_ModelY_Left", Y, "Left"]. */
export function lineupCars(lineup: string): [string, Vehicle, string][] {
  const s = parseLineup(lineup);
  const places = PLACES[s.length];
  return [...s].map((ch, i) => [`Car${i + 1}_${VEHICLES[ch].model}_${places[i]}`, VEHICLES[ch], places[i]]);
}

export function describe(lineup: string): string {
  return lineupCars(lineup).map(([, v]) => v.label).join(' | ');
}
