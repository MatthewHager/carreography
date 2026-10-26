import { defineConfig } from 'vite';

// Built into dist/ with relative URLs so the project root's
// `python3 -m http.server 8765` serves it at /preview3d/dist/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    // `npm run dev` from preview3d/: let it read ../preview and ../output.
    fs: { allow: ['..'] },
  },
});
