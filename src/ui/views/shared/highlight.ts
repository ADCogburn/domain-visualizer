import { lookup, preferredEntry, type TermIndex } from '../../../model/term-index.js';

export const DEFAULT_SKIP = 'code,pre,a,script,style,textarea,button,[data-gl-skip],.gl-term,.gl-avoid';

export interface MarkupOptions {
  /** Prefer entries from this context when a phrase means different things in different contexts. */
  context?: string;
  /** CSS selector for subtrees to leave alone. */
  skip?: string;
}

/**
 * Wrap glossary phrases inside `root` in focusable
 * `<span class="gl-term|gl-avoid" data-term data-context data-kind>` elements.
 * Ported from seed/glossary.js `markup`.
 */
export function markup(root: Element, index: TermIndex, { context, skip = DEFAULT_SKIP }: MarkupOptions = {}): void {
  const regex = index.regex;
  if (!regex) return;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const text = node.nodeValue ?? '';
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    let last = 0;
    const frag = doc.createDocumentFragment();
    while ((m = regex.exec(text))) {
      const hit = preferredEntry(lookup(index, m[0], context));
      if (!hit) continue;
      frag.append(text.slice(last, m.index));
      frag.append(termSpan(doc, m[0], hit.kind, hit.term, hit.context));
      last = m.index + m[0].length;
    }
    if (last === 0) continue;
    frag.append(text.slice(last));
    node.replaceWith(frag);
  }
}

/** A focusable glossary span; also used directly for term names and _Avoid_ lists. */
export function termSpan(doc: Document, text: string, kind: 'term' | 'avoid', term: string, context: string): HTMLSpanElement {
  const span = doc.createElement('span');
  span.className = kind === 'term' ? 'gl-term' : 'gl-avoid';
  span.tabIndex = 0;
  span.textContent = text;
  span.dataset.term = term;
  span.dataset.context = context;
  span.dataset.kind = kind;
  return span;
}
