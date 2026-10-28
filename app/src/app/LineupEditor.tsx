// The cars, crowd's left to right: 1 to 5 of them, each with its paint.

import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAX_CARS, PLACES, VEHICLES } from '@/engine/vehicles';
import { paintColor, type Paint } from '@/viewer/rig';
import { loadPaints, paintLabel } from './models';
import { modelFor } from './show';

export const DEFAULT_PAINT = 'PearlWhite';

export function LineupEditor({ lineup, paints, onChange, disabled }: {
  lineup: string;
  /** The app's paint name per car (paints.json). */
  paints: string[];
  onChange: (lineup: string, paints: string[]) => void;
  disabled?: boolean;
}) {
  const letters = [...lineup];
  const places = PLACES[letters.length];
  const [table, setTable] = useState<Paint[]>([]);
  useEffect(() => void loadPaints().then(setTable), []);
  const change = (cars: [string, string][]) => onChange(cars.map(([l]) => l).join(''), cars.map(([, p]) => p));
  const cars = letters.map((l, i): [string, string] => [l, paints[i] ?? DEFAULT_PAINT]);
  const set = (i: number, car: [string, string]) => change(cars.map((c, k) => (k === i ? car : c)));
  return (
    <div className="space-y-1.5">
      {cars.map(([l, paint], i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">{spaced(places[i])}</span>
          <Select value={l} onValueChange={(v) => set(i, [v, paint])} disabled={disabled}>
            <SelectTrigger size="sm" className="min-w-0 flex-1" aria-label={`Car ${i + 1}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(VEHICLES).map((v) => (
                <SelectItem key={v.letter} value={v.letter}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PaintSelect table={modelFor(l) === 'cybertruck' ? [] : table} value={paint} disabled={disabled}
            label={`Car ${i + 1} paint`} onChange={(p) => set(i, [l, p])} />
          <Button size="icon-sm" variant="ghost" disabled={disabled || letters.length === 1}
            onClick={() => change(cars.filter((_, k) => k !== i))} aria-label={`Remove car ${i + 1}`}>
            <X />
          </Button>
        </div>
      ))}
      {letters.length < MAX_CARS && (
        <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={disabled}
          onClick={() => change([...cars, ['Y', DEFAULT_PAINT]])}>
          <Plus /> Add a car
        </Button>
      )}
    </div>
  );
}

/** A paint swatch that opens the app's paints; the Cybertruck (no table) is stainless only. */
function PaintSelect({ table, value, label, disabled, onChange }: {
  table: Paint[];
  value: string;
  label: string;
  disabled?: boolean;
  onChange: (paint: string) => void;
}) {
  if (!table.length) {
    return (
      <span className="flex w-[54px] shrink-0 justify-start px-2" title="Stainless" aria-label="Stainless">
        <span className="size-4 rounded-full border bg-zinc-400" />
      </span>
    );
  }
  const current = table.find((p) => p.name === value) ?? table.find((p) => p.name === DEFAULT_PAINT) ?? table[0];
  return (
    <Select value={current.name} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="w-auto shrink-0 px-2" aria-label={label} title={paintLabel(current.name)}>
        <Swatch paint={current} />
      </SelectTrigger>
      <SelectContent>
        {table.map((p) => (
          <SelectItem key={p.name} value={p.name}>
            <Swatch paint={p} /> {paintLabel(p.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Swatch({ paint }: { paint: Paint }) {
  return <span className="size-4 shrink-0 rounded-full border" style={{ background: `#${paintColor(paint).getHexString()}` }} />;
}

const spaced = (place: string) => place.replace(/([a-z])([A-Z])/g, '$1 $2');
