/**
 * stdio entry point. Bundled by scripts/build-server.mjs into
 * plugins/domain-visualizer/server/server.js with the view HTML inlined.
 */
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import viewHtml from '../../dist/ui/mcp-app.html';
import { createServer } from './create-server.js';

declare const __VERSION__: string;

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();

serveStdio(() => createServer({ version: __VERSION__, viewHtml, projectRoot, allowDisk: true }), {
  onerror: (e) => console.error('[domain-visualizer]', e),
});
