import { emptyModel, type BoundedContext, type DomainModel } from '../../model/types.js';
import { basename, dirname, resolveFrom } from '../../sources/paths.js';
import type { FileSource } from '../../sources/types.js';
import type { DomainParser } from '../types.js';
import { parseGlossary, parseGlossaryMap } from './parse.js';

const MAP_NAMES = ['GLOSSARY-MAP.md', 'CONTEXT-MAP.md'];
const GLOSSARY_NAMES = ['GLOSSARY.md', 'CONTEXT.md'];

const isMap = (p: string) => /-MAP\.md$/i.test(basename(p));

/**
 * Builds a DomainModel from glossary Markdown:
 *  1. the file the caller pointed at, if any;
 *  2. else a root GLOSSARY-MAP.md / CONTEXT-MAP.md and the glossaries it links to;
 *  3. else a root GLOSSARY.md / CONTEXT.md;
 *  4. else every GLOSSARY.md / CONTEXT.md found in the tree (one context each).
 */
export const glossaryMarkdownParser: DomainParser = {
  id: 'glossary-md',
  async load(source) {
    if (source.entry) {
      return isMap(source.entry) ? loadMap(source, source.entry) : loadSingle(source, [source.entry]);
    }
    for (const name of MAP_NAMES) {
      if ((await source.read(name)) !== undefined) return loadMap(source, name);
    }
    for (const name of GLOSSARY_NAMES) {
      if ((await source.read(name)) !== undefined) return loadSingle(source, [name]);
    }
    const all = await source.listMarkdown();
    const found = pickGlossaries(all);
    if (!found.length) return null;
    const model = await loadSingle(source, found);
    if (found.length > 1) {
      model.warnings.unshift(`no GLOSSARY-MAP.md at the root; found ${found.length} glossaries, so each is shown as its own context`);
    }
    return model;
  },
};

/** One glossary per folder; GLOSSARY.md beats CONTEXT.md in the same folder. */
function pickGlossaries(paths: string[]): string[] {
  const byDir = new Map<string, string>();
  for (const p of paths) {
    const name = basename(p);
    if (!GLOSSARY_NAMES.includes(name)) continue;
    const dir = dirname(p);
    const prev = byDir.get(dir);
    if (!prev || GLOSSARY_NAMES.indexOf(name) < GLOSSARY_NAMES.indexOf(basename(prev))) byDir.set(dir, p);
  }
  return [...byDir.values()].sort();
}

async function loadSingle(source: FileSource, paths: string[]): Promise<DomainModel> {
  const model = emptyModel();
  for (const path of paths) {
    const text = await source.read(path);
    if (text === undefined) {
      model.warnings.push(`${path}: could not be read`);
      continue;
    }
    addGlossary(model, path, text, {});
  }
  return model;
}

async function loadMap(source: FileSource, mapPath: string): Promise<DomainModel> {
  const model = emptyModel();
  const text = await source.read(mapPath);
  if (text === undefined) {
    model.warnings.push(`${mapPath}: could not be read`);
    return model;
  }
  const map = parseGlossaryMap(text);
  model.warnings.push(...map.warnings.map((w) => `${mapPath}: ${w}`));
  if (!map.entries.length) model.warnings.push(`${mapPath}: no "- [Context](./path/GLOSSARY.md): purpose" lines found`);

  for (const entry of map.entries) {
    const path = resolveFrom(mapPath, entry.path);
    const body = path === null ? undefined : await source.read(path);
    if (path === null || body === undefined) {
      model.warnings.push(`${mapPath}: "${entry.context}" links to ${entry.path}, which could not be read`);
      model.contexts.push({ name: entry.context, description: '', purpose: entry.purpose, source: path, terms: [] });
      continue;
    }
    addGlossary(model, path, body, { context: entry.context, purpose: entry.purpose });
  }
  model.relationships.push(...map.relationships);

  const names = new Set(model.contexts.map((c) => c.name));
  for (const r of map.relationships) {
    for (const n of [r.from, r.to]) {
      if (!names.has(n)) model.warnings.push(`${mapPath}: relationship mentions unknown context "${n}"`);
    }
  }
  return model;
}

function addGlossary(model: DomainModel, path: string, text: string, opts: { context?: string; purpose?: string }) {
  const g = parseGlossary(text, { context: opts.context });
  const name = g.context || contextNameFromPath(path);
  for (const t of g.terms) t.context = name;
  for (const r of g.relationships) r.context = name;
  const ctx: BoundedContext = { name, description: g.description, purpose: opts.purpose ?? '', source: path, terms: g.terms };
  model.contexts.push(ctx);
  model.relationships.push(...g.relationships);
  model.warnings.push(...g.warnings.map((w) => `${path}: ${w}`));
}

/** "src/billing/GLOSSARY.md" -> "billing"; a root file -> "Domain". */
function contextNameFromPath(path: string): string {
  const dir = dirname(path);
  return dir ? basename(dir) : 'Domain';
}
