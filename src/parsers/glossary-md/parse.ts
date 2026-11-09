/*
 * Text parsers for Matt Pocock's domain-modeling format: GLOSSARY.md / GLOSSARY-MAP.md,
 * and the older CONTEXT.md / CONTEXT-MAP.md names, which use the same entry format.
 *
 *   # Billing                      <- context name (H1)
 *   One or two sentences on what the context is.
 *
 *   ## Language
 *
 *   ### Invoicing                  <- optional cluster subheading
 *
 *   **Invoice**:
 *   A request for payment sent to a customer after delivery.
 *   _Avoid_: Bill, payment request
 *
 * Tolerated variations (older CONTEXT.md files and hand edits):
 *   - definition on the same line:      **Invoice**: A request for ...
 *   - colon inside the bold:            **Invoice:**
 *   - multi-line definitions
 *   - *Avoid*: / Avoid: / _Avoid:_ spellings, aliases split by commas or semicolons
 *
 * Pure functions over strings: no I/O, no DOM.
 */
import type { ContextRelationship, Term, TermRelationship } from '../../model/types.js';

const TERM_RE = /^\*\*(.+?):?\*\*:?\s*(.*)$/; // **Term**:  [optional inline definition]
const AVOID_RE = /^[_*]?avoid[_*]?\s*:[_*]?\s*(.*)$/i; // _Avoid_: a, b
const H1_RE = /^#\s+(.+?)\s*#*$/;
const H2_RE = /^##\s+(.+?)\s*#*$/;
const SUBHEAD_RE = /^#{3,6}\s+(.+?)\s*#*$/;
const BULLET_RE = /^\s*[-*+]\s+(.*)$/;
const BOLD_RE = /\*\*(.+?)\*\*/g;

export interface ParsedGlossary {
  context: string;
  description: string;
  terms: Term[];
  relationships: TermRelationship[];
  /** "line N: ..." messages. */
  warnings: string[];
}

export interface ParseGlossaryOptions {
  /** Override the context name (e.g. from GLOSSARY-MAP.md). */
  context?: string;
}

interface Draft {
  name: string;
  definition: string[];
  avoid: string[];
  cluster: string | null;
  line: number;
  /** A blank line ended the definition paragraph; only a late _Avoid_ line may follow. */
  closed: boolean;
}

/** Parse one GLOSSARY.md (or legacy CONTEXT.md). */
export function parseGlossary(markdown: string, opts: ParseGlossaryOptions = {}): ParsedGlossary {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let context = opts.context ?? '';
  let sawH1 = false;
  const terms: Term[] = [];
  const relationships: TermRelationship[] = [];
  const warnings: string[] = [];
  let section: 'preamble' | 'language' | 'relationships' | 'other' = 'preamble';
  let cluster: string | null = null;
  let current: Draft | null = null;
  const descLines: string[] = [];

  const finish = () => {
    if (!current) return;
    const definition = current.definition.join(' ').replace(/\s+/g, ' ').trim();
    if (!definition) warnings.push(`line ${current.line}: "${current.name}" has no definition`);
    terms.push({ name: current.name, definition, avoid: current.avoid, cluster: current.cluster, context: '', line: current.line });
    current = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    const lineNo = i + 1;
    let m: RegExpMatchArray | null;

    if ((m = line.match(H1_RE))) {
      finish();
      if (sawH1) {
        warnings.push(`line ${lineNo}: second H1 "${stripMd(m[1]!)}" ignored; use one file per context and list them in GLOSSARY-MAP.md`);
      } else if (!opts.context) {
        context = stripMd(m[1]!);
      }
      sawH1 = true;
      return;
    }
    if ((m = line.match(H2_RE))) {
      finish();
      const title = stripMd(m[1]!);
      section = /^language$/i.test(title) ? 'language' : /^relationships$/i.test(title) ? 'relationships' : 'other';
      cluster = null;
      return;
    }
    if (section === 'preamble') {
      if (line) descLines.push(line);
      return;
    }
    if (section === 'relationships') {
      const b = line.match(BULLET_RE);
      if (b) {
        const mentioned = [...b[1]!.matchAll(BOLD_RE)].map((x) => stripMd(x[1]!));
        relationships.push({ kind: 'term', context: '', description: stripMd(b[1]!), terms: mentioned });
      }
      return;
    }
    if (section !== 'language') return;

    if ((m = line.match(SUBHEAD_RE))) {
      finish();
      cluster = stripMd(m[1]!);
      return;
    }
    if ((m = line.match(TERM_RE))) {
      finish();
      current = { name: stripMd(m[1]!), definition: [], avoid: [], cluster, line: lineNo, closed: false };
      if (m[2]) current.definition.push(m[2]);
      return;
    }
    if (!current) {
      if (line) warnings.push(`line ${lineNo}: text outside any term entry`);
      return;
    }
    const draft: Draft = current;
    if ((m = line.match(AVOID_RE))) {
      draft.avoid = splitList(m[1]!);
      return;
    }
    if (!line) {
      // A blank line ends the definition paragraph, but keeps the entry open for a late _Avoid_ line.
      if (draft.definition.length) draft.closed = true;
      return;
    }
    if (draft.closed) {
      finish();
      warnings.push(`line ${lineNo}: text outside any term entry`);
      return;
    }
    draft.definition.push(line);
  });
  finish();

  for (const t of terms) t.context = context;
  for (const r of relationships) r.context = context;
  return { context, description: descLines.join(' '), terms, relationships, warnings };
}

export interface MapEntry {
  context: string;
  path: string;
  purpose: string;
}

export interface ParsedGlossaryMap {
  entries: MapEntry[];
  relationships: ContextRelationship[];
  warnings: string[];
}

const MAP_ENTRY_RE = /^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*[:—-]?\s*(.*)$/;
// - **Ordering → Fulfillment**: description     (also ->, <->, ↔, ⇄, ←, <-)
const MAP_REL_RE = /^\s*[-*+]\s+\*\*(.+?)\s*(<->|↔|⇄|->|→|<-|←)\s*(.+?):?\*\*:?\s*(.*)$/;

/**
 * Parse GLOSSARY-MAP.md (or CONTEXT-MAP.md): the context list, e.g.
 * "- [Billing](./src/billing/GLOSSARY.md): generates invoices and processes payments",
 * and the "## Relationships" bullets, e.g. "- **Ordering → Billing**: ...".
 */
export function parseGlossaryMap(markdown: string): ParsedGlossaryMap {
  const entries: MapEntry[] = [];
  const relationships: ContextRelationship[] = [];
  const warnings: string[] = [];
  let section = '';
  markdown.split(/\r?\n/).forEach((raw, i) => {
    const h = raw.trim().match(H2_RE);
    if (h) {
      section = stripMd(h[1]!).toLowerCase();
      return;
    }
    if (section === 'relationships') {
      const r = raw.match(MAP_REL_RE);
      if (r) {
        const [, a, arrow, b, desc] = r as unknown as [string, string, string, string, string];
        const backwards = arrow === '<-' || arrow === '←';
        relationships.push({
          kind: 'context',
          from: stripMd(backwards ? b : a),
          to: stripMd(backwards ? a : b),
          bidirectional: arrow === '<->' || arrow === '↔' || arrow === '⇄',
          description: stripMd(desc),
        });
      } else if (BULLET_RE.test(raw)) {
        warnings.push(`line ${i + 1}: relationship not in "- **A → B**: description" form`);
      }
      return;
    }
    const m = raw.match(MAP_ENTRY_RE);
    if (m) entries.push({ context: m[1]!.trim(), path: m[2]!.trim(), purpose: m[3]!.trim() });
  });
  return { entries, relationships, warnings };
}

function splitList(s: string): string[] {
  return s
    .split(/[,;]/)
    .map((x) => stripMd(x).trim())
    .filter(Boolean);
}

/** Strip inline Markdown emphasis/code markers. Backticks keep their content. */
export function stripMd(s: string): string {
  return s.replace(/[*_`]/g, '').trim();
}
