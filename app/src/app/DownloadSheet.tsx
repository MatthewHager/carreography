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
  const name = fileName(show.title);
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button size="lg" className="h-11 w-full rounded-full text-[0.9375rem]"><Download /> Get the files</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg overflow-y-auto">
          <DrawerHeader className="md:text-center">
            <DrawerTitle className="text-xl">Put the show on your cars</DrawerTitle>
            <DrawerDescription>One USB drive for each car.</DrawerDescription>
          </DrawerHeader>
          <ol className="list-decimal space-y-4 px-4 pl-9 text-sm leading-relaxed text-muted-foreground
            marker:text-foreground">
            <li>
              Download the ZIP. It has a folder for each car, crowd's left to right:
              <ul className="mt-2 divide-y rounded-xl border text-xs">
                {lineupCars(show.lineup).map(([folder, v]) => (
                  <li key={folder} className="flex justify-between gap-3 px-3 py-2">
                    <code className="truncate text-foreground">{folder}</code>
                    <span className="shrink-0">{v.label}</span>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              On each drive (exFAT or FAT32), put that car's{' '}
              <code className="text-[0.9em] text-foreground">LightShow</code> folder at the top level, not inside
              another folder. It holds the show
              (<code className="text-[0.9em] text-foreground">{name}.fseq</code>) and the song
              (<code className="text-[0.9em] text-foreground">{name}.wav</code>).
            </li>
            <li>
              Plug each drive into its car and open Toybox, then Light Show. To start the cars together, schedule the
              same start time on each in the Tesla app.
            </li>
          </ol>
          <DrawerFooter className="pt-6">
            <Button size="lg" className="h-11 rounded-full text-[0.9375rem]" onClick={() => void download(show)}>
              <Download /> Download ZIP
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
