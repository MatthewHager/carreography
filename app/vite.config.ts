import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const repo = path.resolve(import.meta.dirname, '..')

/** While developing only: the Python analyses (cache/bridge) and recordings (output/) on this machine,
 * served under dev/. None of it is ever part of a build. */
function devFiles(): Plugin {
  const roots: Record<string, string> = {
    bridge: path.join(repo, 'cache', 'bridge'),
    output: path.join(repo, 'output'),
  }
  return {
    name: 'dev-files',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/carreography/dev/', (req, res, next) => {
        const [root, ...rest] = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\//, '').split('/')
        const base = roots[root]
        const file = base && path.join(base, ...rest)
        if (!file || !file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Length', statSync(file).size)
        createReadStream(file).pipe(res)
      })
    },
  }
}

// The site is served from matthewhager.github.io/carreography/.
export default defineConfig({
  base: '/carreography/',
  plugins: [react(), tailwindcss(), devFiles()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  worker: { format: 'es' },
})
