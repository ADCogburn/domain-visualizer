import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const repo = fileURLToPath(new URL('.', import.meta.url));
const manifest = JSON.parse(readFileSync(`${repo}plugins/domain-visualizer/.claude-plugin/plugin.json`, 'utf8'));

// `vite build` -> dist/ui/mcp-app.html, one self-contained file (scripts and CSS inlined),
// which scripts/build-server.mjs embeds in the server bundle.
// `vite` (npm run dev:ui) serves src/ui/dev.html with fixture data.
export default defineConfig({
  root: 'src/ui',
  plugins: [viteSingleFile()],
  define: { __VERSION__: JSON.stringify(manifest.version) },
  server: {
    open: '/dev.html',
    fs: { allow: [repo] },
  },
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
    rollupOptions: { input: `${repo}src/ui/mcp-app.html` },
  },
});
