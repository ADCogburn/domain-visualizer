// Launch MCPJam Inspector against the built server. MCPJam asks for absolute paths.
// Extra args are passed through, e.g. `npm run inspect -- --port 4000`.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const server = resolve('plugins/domain-visualizer/server/server.js');
if (!existsSync(server)) {
  console.error(`${server} is missing; run "npm run build" first.`);
  process.exit(1);
}
const args = ['-y', '@mcpjam/inspector@3.19.0', ...process.argv.slice(2), 'node', server];
const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CLAUDE_PROJECT_DIR: resolve('fixtures') },
});
child.on('exit', (code) => process.exit(code ?? 0));
