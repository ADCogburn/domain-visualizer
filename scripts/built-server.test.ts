/**
 * End-to-end check of the committed bundle: spawn plugins/domain-visualizer/server/server.js
 * over stdio exactly as Claude would, list tools/resources, and call show_domain on the fixtures.
 * Skipped until `npm run build` has produced the bundle.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repo = join(import.meta.dirname, '..');
const bundle = join(repo, 'plugins/domain-visualizer/server/server.js');

type Json = Record<string, any>;

describe.skipIf(!existsSync(bundle))('built server (stdio)', () => {
  let child: ChildProcessWithoutNullStreams;
  let buf = '';
  let nextId = 1;
  const pending = new Map<number, (msg: Json) => void>();

  const request = (method: string, params: Json = {}) =>
    new Promise<Json>((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 10_000);
      pending.set(id, (m) => {
        clearTimeout(timer);
        if (m.error) reject(new Error(JSON.stringify(m.error)));
        else resolve(m.result);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });

  beforeAll(async () => {
    child = spawn(process.execPath, [bundle], { cwd: repo, env: { ...process.env, CLAUDE_PROJECT_DIR: repo } });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d: string) => {
      buf += d;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        const msg = JSON.parse(line) as Json;
        if (typeof msg.id === 'number') pending.get(msg.id)?.(msg);
      }
    });
    await request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } },
      clientInfo: { name: 'smoke', version: '0' },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  });

  afterAll(() => child?.kill());

  it('lists show_domain with its UI resource', async () => {
    const { tools } = await request('tools/list');
    const tool = tools.find((t: Json) => t.name === 'show_domain');
    expect(tool).toBeTruthy();
    expect(tool._meta.ui.resourceUri).toBe('ui://domain-visualizer/domain-view.html');
    expect(Object.keys(tool.inputSchema.properties).sort()).toEqual(['files', 'path', 'view']);
    expect(tool.annotations.readOnlyHint).toBe(true);
  });

  it('serves the single-file view HTML', async () => {
    const { contents } = await request('resources/read', { uri: 'ui://domain-visualizer/domain-view.html' });
    expect(contents[0].mimeType).toBe('text/html;profile=mcp-app');
    expect(contents[0].text).toMatch(/^<!doctype html>/i);
    expect(contents[0].text).not.toMatch(/<script[^>]+src=/); // everything inlined
  });

  for (const fixture of ['single-context', 'multi-context', 'legacy-context']) {
    it(`calls show_domain on fixtures/${fixture}`, async () => {
      const r = await request('tools/call', { name: 'show_domain', arguments: { path: `fixtures/${fixture}` } });
      expect(r.isError).toBeFalsy();
      expect(r.content[0].text).toMatch(/^Domain glossary from .*: \d+ terms? in \d+ contexts?\./);
      // The model goes to the view via _meta, so hosts show the model the text, not JSON.
      expect(r.structuredContent).toBeUndefined();
      const payload = r._meta['domain-visualizer/payload'];
      expect(payload.model.contexts.length).toBeGreaterThan(0);
      expect(payload.model.warnings).toEqual([]);
    });
  }
});
