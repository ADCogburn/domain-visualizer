import { emptyModel, type DomainModel } from '../model/types.js';
import type { FileSource } from '../sources/types.js';
import { isAdrPath, loadAdrs } from './adr-md/load.js';
import { glossaryMarkdownParser } from './glossary-md/load.js';
import { projectName } from './project.js';
import type { DomainParser } from './types.js';

export type { DomainParser } from './types.js';
export { parseGlossary, parseGlossaryMap } from './glossary-md/parse.js';
export { parseAdr } from './adr-md/parse.js';

/** Registered glossary formats, tried in order. */
export const parsers: DomainParser[] = [glossaryMarkdownParser];

export interface LoadOptions {
  /** Display name for the Project; overrides package.json and the folder name. */
  project?: string;
}

/**
 * Build the domain model: the Glossary from the first parser whose format is present,
 * the ADRs next to it, and the Project's name.
 */
export async function loadDomain(source: FileSource, opts: LoadOptions = {}): Promise<DomainModel> {
  // A lone ADR (one inline file, or a path to an ADR) isn't a glossary to load.
  const src = source.entry && isAdrPath(source.entry) ? { ...source, entry: undefined } : source;

  let glossary: DomainModel | null = null;
  for (const p of parsers) {
    glossary = await p.load(src);
    if (glossary) break;
  }
  const model = glossary ?? emptyModel();

  const { adrs, warnings } = await loadAdrs(src, model.contexts);
  model.adrs = adrs;
  model.warnings.push(...warnings);
  if (!glossary && !adrs.length) {
    model.warnings.push(`no GLOSSARY-MAP.md, GLOSSARY.md, CONTEXT-MAP.md, CONTEXT.md or docs/adr/*.md found in ${source.label}`);
  }
  model.project = opts.project?.trim() || (await projectName(source));
  return model;
}
