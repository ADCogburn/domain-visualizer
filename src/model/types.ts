/**
 * The domain model: the one shape every parser produces and every view consumes.
 *
 * Layering rule: this folder imports nothing from parsers/, sources/, server/ or ui/.
 * It must stay JSON-serializable, because the server sends it to the view in the
 * tool result's `_meta` (see PAYLOAD_META_KEY in src/shared/protocol.ts).
 */

/** One entry in a context's ubiquitous language. */
export interface Term {
  /** Canonical name, e.g. "Invoice". */
  name: string;
  /** Definition text with Markdown emphasis stripped and whitespace collapsed. */
  definition: string;
  /** Synonyms the team has agreed not to use; each points back to `name`. */
  avoid: string[];
  /** Optional subheading the term is grouped under (H3-H6 inside "## Language"). */
  cluster: string | null;
  /** Name of the bounded context that owns this term. */
  context: string;
  /** 1-based line of the term's heading in its source file. */
  line: number;
}

/** A bounded context: one GLOSSARY.md (or legacy CONTEXT.md). */
export interface BoundedContext {
  name: string;
  /** The short paragraph under the H1. */
  description: string;
  /** One-line purpose from the context map, when there is one. */
  purpose: string;
  /** Repo-relative path of the file the context came from, when known. */
  source: string | null;
  terms: Term[];
}

/** How two contexts relate, from the "## Relationships" section of a context map. */
export interface ContextRelationship {
  kind: 'context';
  from: string;
  to: string;
  /** true for `↔` / `<->`, false for `→` / `->`. */
  bidirectional: boolean;
  description: string;
}

/** A sentence relating terms inside one context, from a glossary's "## Relationships" section. */
export interface TermRelationship {
  kind: 'term';
  context: string;
  description: string;
  /** Bolded term names mentioned in the sentence, in order. */
  terms: string[];
}

export type Relationship = ContextRelationship | TermRelationship;

/** An architecture decision record: one Markdown file under a `docs/adr/` folder. */
export interface Adr {
  /** Repo-relative path; unique, so it doubles as the ADR's id. */
  path: string;
  /** From the filename's leading digits (`0007-slug.md` -> 7), or null. */
  number: number | null;
  /** The H1, or the filename turned into words when there is none. */
  title: string;
  /** From `status:` frontmatter, e.g. "accepted", or null. */
  status: string | null;
  /** The Bounded Context whose folder the ADR sits in; null for Project-wide ADRs. */
  context: string | null;
  /** The first paragraph after the title, as plain text. */
  summary: string;
  /** The Markdown after the frontmatter and the H1. */
  body: string;
}

export interface DomainModel {
  /** The Project's display name. */
  project: string;
  contexts: BoundedContext[];
  relationships: Relationship[];
  adrs: Adr[];
  /** Human-readable problems found while reading the sources. */
  warnings: string[];
}

export function emptyModel(project = 'Domain'): DomainModel {
  return { project, contexts: [], relationships: [], adrs: [], warnings: [] };
}

/** 7 -> "0007", the way ADR filenames write it. */
export function adrNumber(n: number): string {
  return String(n).padStart(4, '0');
}

export function countTerms(model: DomainModel): number {
  return model.contexts.reduce((n, c) => n + c.terms.length, 0);
}
