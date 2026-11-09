import type { Adr, BoundedContext } from '../../model/types.js';
import { basename, dirname } from '../../sources/paths.js';
import type { FileSource } from '../../sources/types.js';
import { parseAdr } from './parse.js';

/** More than this many ADRs are left out of the payload (with a warning) to keep it small. */
export const MAX_ADRS = 300;

const ADR_DIR = 'docs/adr';
const NOT_ADRS = /^(readme|index|template)\.md$|template/i;

/** True for a Markdown file directly inside a `docs/adr/` folder. */
export function isAdrPath(path: string): boolean {
  const dir = dirname(path);
  return /\.md$/i.test(path) && (dir === ADR_DIR || dir.endsWith(`/${ADR_DIR}`)) && !NOT_ADRS.test(basename(path));
}

/**
 * ADRs in the root `docs/adr/` (Project-wide) and in each Bounded Context's own
 * `docs/adr/`, next to its glossary file. Sorted by number, unnumbered ones last by title.
 */
export async function loadAdrs(source: FileSource, contexts: BoundedContext[]): Promise<{ adrs: Adr[]; warnings: string[] }> {
  const owners = new Map<string, string | null>([[ADR_DIR, null]]);
  for (const c of contexts) {
    const dir = c.source ? dirname(c.source) : '';
    if (dir && !owners.has(`${dir}/${ADR_DIR}`)) owners.set(`${dir}/${ADR_DIR}`, c.name);
  }

  const adrs: Adr[] = [];
  const warnings: string[] = [];
  const paths = (await source.listMarkdown()).filter((p) => isAdrPath(p) && owners.has(dirname(p)));
  for (const path of paths) {
    const text = await source.read(path);
    if (text === undefined) {
      warnings.push(`${path}: could not be read`);
      continue;
    }
    adrs.push({ path, context: owners.get(dirname(path)) ?? null, ...parseAdr(path, text) });
  }

  adrs.sort(
    (a, b) =>
      (a.number ?? Infinity) - (b.number ?? Infinity) || a.title.localeCompare(b.title) || a.path.localeCompare(b.path),
  );
  if (adrs.length > MAX_ADRS) {
    warnings.push(`found ${adrs.length} ADRs; showing the first ${MAX_ADRS}`);
    adrs.length = MAX_ADRS;
  }
  return { adrs, warnings };
}
