import type { DomainModel } from '../model/types.js';
import type { FileSource } from '../sources/types.js';

/**
 * One input format. A parser reads through a FileSource and returns a DomainModel,
 * or null when its format isn't present so the next parser can try.
 *
 * Adding a format = adding a parser here and registering it in ./index.ts.
 * Nothing in model/, server/ or ui/ should need to change.
 */
export interface DomainParser {
  id: string;
  load(source: FileSource): Promise<DomainModel | null>;
}
