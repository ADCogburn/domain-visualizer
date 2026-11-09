import type { DomainModel } from '../model/types.js';
import type { FileSource } from '../sources/types.js';
import { glossaryMarkdownParser } from './glossary-md/load.js';
import type { DomainParser } from './types.js';

export type { DomainParser } from './types.js';
export { parseGlossary, parseGlossaryMap } from './glossary-md/parse.js';

/** Registered input formats, tried in order. */
export const parsers: DomainParser[] = [glossaryMarkdownParser];

/** Build the domain model from the first parser whose format is present in the source. */
export async function loadDomain(source: FileSource): Promise<DomainModel> {
  for (const p of parsers) {
    const model = await p.load(source);
    if (model) return model;
  }
  return {
    contexts: [],
    relationships: [],
    warnings: [`no GLOSSARY-MAP.md, GLOSSARY.md, CONTEXT-MAP.md or CONTEXT.md found in ${source.label}`],
  };
}
