import type { BoundedContext, DomainModel } from './types.js';

/** One phrase a view can recognise in text: a canonical term or one of its avoided synonyms. */
export interface IndexEntry {
  phrase: string;
  kind: 'term' | 'avoid';
  /** The canonical term name the phrase resolves to. */
  term: string;
  definition: string;
  context: string;
}

export interface TermIndex {
  /** Lower-cased phrase -> entries. One phrase can mean different things in different contexts. */
  byPhrase: Map<string, IndexEntry[]>;
  /**
   * Global, Unicode-aware regex matching any known phrase (plus simple plural/possessive
   * endings) on word boundaries, longest phrase first. `null` when the index is empty.
   * It is stateful (`g` flag): reset `lastIndex` before `exec` loops.
   */
  regex: RegExp | null;
}

/** Build a lookup index over every term and avoided synonym in the model. */
export function buildIndex(source: DomainModel | BoundedContext[]): TermIndex {
  const contexts = Array.isArray(source) ? source : source.contexts;
  const byPhrase = new Map<string, IndexEntry[]>();
  const add = (e: IndexEntry) => {
    const k = e.phrase.toLowerCase().replace(/\s+/g, ' ');
    const list = byPhrase.get(k);
    if (list) list.push(e);
    else byPhrase.set(k, [e]);
  };
  for (const c of contexts) {
    for (const t of c.terms) {
      add({ phrase: t.name, kind: 'term', term: t.name, definition: t.definition, context: t.context });
      for (const a of t.avoid) add({ phrase: a, kind: 'avoid', term: t.name, definition: t.definition, context: t.context });
    }
  }
  // Longest first so "payment request" wins over "payment".
  const phrases = [...byPhrase.keys()].sort((a, b) => b.length - a.length);
  const alt = phrases.map((p) => escapeRe(p).replace(/\s+/g, '\\s+') + "(?:e?s|'s)?").join('|');
  const regex = alt ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alt})(?![\\p{L}\\p{N}_])`, 'giu') : null;
  return { byPhrase, regex };
}

/**
 * Resolve matched text to its index entries, tolerating plural and possessive endings.
 * With `context`, entries from that context win when there are any.
 */
export function lookup(index: TermIndex, text: string, context?: string): IndexEntry[] {
  const norm = text.toLowerCase().replace(/\s+/g, ' ');
  const hits =
    index.byPhrase.get(norm) ??
    index.byPhrase.get(norm.replace(/'s$/, '')) ??
    index.byPhrase.get(norm.replace(/s$/, '')) ??
    index.byPhrase.get(norm.replace(/es$/, '')) ??
    [];
  if (context) {
    const inCtx = hits.filter((h) => h.context === context);
    if (inCtx.length) return inCtx;
  }
  return hits;
}

/** Pick the entry to show for a match: a canonical term beats an avoided synonym. */
export function preferredEntry(hits: IndexEntry[]): IndexEntry | undefined {
  return hits.find((h) => h.kind === 'term') ?? hits[0];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
