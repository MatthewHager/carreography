// Tesla's car models aren't ours to host: this explains where they come from and takes the files.

import { Box } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import type { AppModelId } from '@/viewer/car/appBody';
import { FILES } from '@/viewer/car/appBody';
import { addModelFile, MODEL_LABELS } from './models';

export function ModelsCard({ missing, onAdded }: { missing: AppModelId[]; onAdded: () => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'model/gltf-binary': ['.glb'] },
    onDrop: async (files) => {
      let added = 0;
      for (const f of files) {
        try {
          const id = await addModelFile(f);
          if (id) added++;
          else toast.error(`${f.name} isn't one of the Tesla app's models`);
        } catch {
          toast.error(`${f.name} couldn't be read as a 3D model`);
        }
      }
      if (added) {
        toast.success(added === 1 ? 'Model added' : `${added} models added`);
        onAdded();
      }
    },
  });
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        The 3D preview uses Tesla's own car models from the Tesla app. They belong to Tesla, so this site
        can't include them: extract them once with{' '}
        <a className="text-foreground underline underline-offset-2" href="https://github.com/koenhendriks/tesla-model-extractor"
          target="_blank" rel="noreferrer">tesla-model-extractor</a>{' '}
        and add the files here. Your browser keeps them.
      </p>
      <ul className="space-y-1">
        {missing.map((id) => (
          <li key={id} className="flex justify-between text-xs">
            <span>{MODEL_LABELS[id]}</span>
            <code className="text-muted-foreground">{FILES[id]}</code>
          </li>
        ))}
      </ul>
      <div {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-3 py-4 text-center
          text-xs text-muted-foreground transition-colors ${isDragActive ? 'border-ring bg-accent/40' : 'hover:bg-accent/30'}`}>
        <input {...getInputProps()} />
        <Box className="size-5" />
        Drop the .glb files here, or click to choose them
      </div>
      <p className="text-xs text-muted-foreground">The light show files work without them.</p>
    </div>
  );
}
