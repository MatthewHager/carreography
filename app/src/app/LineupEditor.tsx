// The cars, crowd's left to right: 1 to 5 of them.

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAX_CARS, PLACES, VEHICLES } from '@/engine/vehicles';

export function LineupEditor({ lineup, onChange, disabled }: {
  lineup: string;
  onChange: (lineup: string) => void;
  disabled?: boolean;
}) {
  const letters = [...lineup];
  const places = PLACES[letters.length];
  const set = (i: number, letter: string) => onChange(letters.map((l, k) => (k === i ? letter : l)).join(''));
  const remove = (i: number) => onChange(letters.filter((_, k) => k !== i).join(''));
  return (
    <div className="space-y-1.5">
      {letters.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">{spaced(places[i])}</span>
          <Select value={l} onValueChange={(v) => set(i, v)} disabled={disabled}>
            <SelectTrigger size="sm" className="flex-1" aria-label={`Car ${i + 1}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(VEHICLES).map((v) => (
                <SelectItem key={v.letter} value={v.letter}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon-sm" variant="ghost" disabled={disabled || letters.length === 1} onClick={() => remove(i)}
            aria-label={`Remove car ${i + 1}`}>
            <X />
          </Button>
        </div>
      ))}
      {letters.length < MAX_CARS && (
        <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={disabled}
          onClick={() => onChange(lineup + 'Y')}>
          <Plus /> Add a car
        </Button>
      )}
    </div>
  );
}

const spaced = (place: string) => place.replace(/([a-z])([A-Z])/g, '$1 $2');
