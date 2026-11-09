/**
 * Browser-only harness for `npm run dev:ui`: renders the real shell and views with
 * fixture data and a fake host, so the UI can be worked on without Claude.
 */
import { loadDomain } from '../parsers/index.js';
import type { ShowDomainPayload } from '../shared/protocol.js';
import { inlineSource } from '../sources/inline.js';
import { createShell } from './shell.js';
import type { DisplayMode } from './views/index.js';
import './styles.css';

const raw = import.meta.glob<string>('../../fixtures/**/*.md', { query: '?raw', import: 'default', eager: true });

// Group files by fixture folder: "../../fixtures/<name>/<path>"
const fixtures = new Map<string, { path: string; content: string }[]>();
for (const [key, content] of Object.entries(raw)) {
  const [, name, ...rest] = key.replace(/^(\.\.\/)+fixtures\//, 'fixtures/').split('/');
  if (!name) continue;
  if (!fixtures.has(name)) fixtures.set(name, []);
  fixtures.get(name)!.push({ path: rest.join('/'), content });
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fixtureSel = $<HTMLSelectElement>('fixture');
const themeSel = $<HTMLSelectElement>('theme');
const modeSel = $<HTMLSelectElement>('mode');
const widthSel = $<HTMLSelectElement>('width');
const canFs = $<HTMLInputElement>('canfs');
const frame = $<HTMLDivElement>('frame');

for (const name of [...fixtures.keys()].sort()) fixtureSel.append(new Option(name, name));
fixtureSel.value = fixtures.has('multi-context') ? 'multi-context' : fixtureSel.value;

const shell = createShell($('app'), {
  displayMode: () => modeSel.value as DisplayMode,
  availableDisplayModes: () => (canFs.checked ? ['inline', 'fullscreen'] : ['inline']),
  async requestDisplayMode(mode) {
    modeSel.value = mode;
    applyFrame();
    return mode;
  },
});

function applyFrame() {
  frame.dataset.mode = modeSel.value;
  frame.style.maxWidth = `${widthSel.value}px`;
  const t = themeSel.value;
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

async function load() {
  const files = fixtures.get(fixtureSel.value) ?? [];
  const model = await loadDomain(inlineSource(files));
  const payload: ShowDomainPayload = { view: 'glossary', source: `fixtures/${fixtureSel.value}`, model };
  shell.showPayload(payload);
}

fixtureSel.addEventListener('change', () => void load());
for (const el of [themeSel, modeSel, widthSel, canFs]) {
  el.addEventListener('change', () => {
    applyFrame();
    shell.refresh();
  });
}
applyFrame();
void load();
