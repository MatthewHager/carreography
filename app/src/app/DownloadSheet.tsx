// The files for the cars: one USB drive per car, each with a LightShow folder.

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { stringHeader, writeFseq } from '@/viewer/core/fseq';
import { lineupCars } from '@/engine/vehicles';
import { CHANNELS, fileName, STEP_S, type Show } from './show';
import { zip } from './zip';

function fseqFor(show: Show, frames: Uint8Array, name: string): Uint8Array<ArrayBuffer> {
  let id = 0xcbf29ce484222325n;                       // FNV-1a of the frames: the same show, the same file
  for (let i = 0; i < frames.length; i += 64) id = ((id ^ BigInt(frames[i])) * 0x100000001b3n) & 0xffffffffffffffffn;
  return writeFseq({
    channelCount: CHANNELS, frameCount: show.nFrames, stepTimeMs: STEP_S * 1000, minorVersion: 0, uniqueId: id,
    variableHeaders: [stringHeader('mf', `${name}.wav`), stringHeader('sp', 'Carreography')], data: frames,
  });
}

async function download(show: Show) {
  const name = fileName(show.title);
  const audio = new Uint8Array(await show.audio.arrayBuffer());
  const files = show.cars.flatMap((car) => [
    { path: `${car.name}/LightShow/${name}.fseq`, data: fseqFor(show, car.frames, name) },
    { path: `${car.name}/LightShow/${name}.wav`, data: audio },
  ]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zip(files));
  a.download = `${name}_lightshow.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

export function DownloadSheet({ show }: { show: Show }) {
  const cars = lineupCars(show.lineup);
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="w-full"><Download /> Get the files for your cars</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Put the show on your cars</DrawerTitle>
            <DrawerDescription>One USB drive per car, formatted exFAT or FAT32.</DrawerDescription>
          </DrawerHeader>
          <ol className="list-decimal space-y-2 px-4 pl-9 text-sm text-muted-foreground">
            <li>Download the ZIP. It has a folder for each car, crowd's left to right:
              <ul className="mt-1 space-y-0.5 text-xs">
                {cars.map(([folder, v]) => <li key={folder}><code className="text-foreground">{folder}</code> · {v.label}</li>)}
              </ul>
            </li>
            <li>Copy that car's <code className="text-foreground">LightShow</code> folder to the top level of its USB drive.</li>
            <li>Plug each drive into its car, open Toybox → Light Show, and schedule the same start time on every car
              in the Tesla app.</li>
          </ol>
          <DrawerFooter>
            <Button onClick={() => void download(show)}><Download /> Download ZIP</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
