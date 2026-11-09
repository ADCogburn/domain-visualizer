import { buildIndex } from '../../../model/term-index.js';
import { countTerms, type BoundedContext, type DomainModel, type Term } from '../../../model/types.js';
import type { DomainView, ViewContext } from '../types.js';
import { markup, termSpan } from './highlight.js';
import { createTooltip } from './tooltip.js';
import './glossary.css';

/** How many terms an inline card shows before offering "Show all". */
export const INLINE_LIMIT = 8;

/**
 * Glossary view: every context's terms with definitions. Glossary phrases get a dotted
 * underline; avoided synonyms are greyed and point at the canonical term. Hovering or
 * focusing one shows its definition in a small tooltip next to it, kept inside the
 * iframe's viewport (see tooltip.ts) because the host clips anything outside it.
 */
export const glossaryView: DomainView = {
  id: 'glossary',
  title: 'Glossary',
  render(root, model, ctx) {
    let expanded = false;
    const draw = () => {
      root.replaceChildren();
      renderGlossary(root, model, ctx, expanded, () => {
        if (ctx.canFullscreen) void ctx.requestDisplayMode('fullscreen');
        else {
          expanded = true;
          draw();
        }
      });
    };
    draw();
  },
};

function renderGlossary(root: HTMLElement, model: DomainModel, ctx: ViewContext, expanded: boolean, onShowAll: () => void) {
  const doc = root.ownerDocument;
  const full = ctx.displayMode === 'fullscreen';
  const index = buildIndex(model);
  const terms = new Map<string, Term>();
  for (const c of model.contexts) for (const t of c.terms) terms.set(key(t.context, t.name), t);
  const multi = model.contexts.length > 1;

  const wrap = el(doc, 'div', { class: `gl-view ${full ? 'gl-full' : 'gl-inline'}` });
  const list = el(doc, 'div', { class: 'gl-list' });

  const limit = full || expanded ? Infinity : INLINE_LIMIT;
  let shown = 0;
  for (const c of model.contexts) {
    if (shown >= limit) break;
    const section = renderContext(doc, c, multi, limit - shown);
    shown += Math.min(c.terms.length, limit - shown);
    list.append(section);
  }

  const total = countTerms(model);
  if (shown < total) {
    const more = el(doc, 'button', { class: 'gl-more', type: 'button' }, `Show all ${total} terms`);
    more.addEventListener('click', onShowAll);
    list.append(more);
  }

  if (full) {
    const termRels = model.relationships.filter((r) => r.kind === 'term');
    const ctxRels = model.relationships.filter((r) => r.kind === 'context');
    if (termRels.length || ctxRels.length) {
      const sec = el(doc, 'section', { class: 'gl-rels' }, el(doc, 'h2', {}, 'Relationships'));
      const ul = el(doc, 'ul');
      for (const r of ctxRels) {
        ul.append(el(doc, 'li', {}, `${r.from} ${r.bidirectional ? '↔' : '→'} ${r.to}: ${r.description}`));
      }
      for (const r of termRels) {
        const li = el(doc, 'li', { 'data-context': r.context }, multi ? `${r.context}: ${r.description}` : r.description);
        ul.append(li);
      }
      sec.append(ul);
      list.append(sec);
    }
  }

  if (!model.contexts.length) list.append(el(doc, 'p', { class: 'gl-empty' }, 'No glossary terms found.'));

  // Mark glossary phrases in running text, preferring each section's own context.
  for (const node of list.querySelectorAll<HTMLElement>('[data-markup]')) {
    markup(node, index, { context: node.closest<HTMLElement>('[data-context]')?.dataset.context });
  }

  wrap.append(list);
  root.append(wrap);

  const tip = createTooltip(doc);
  const show = (span: HTMLElement) => {
    const term = terms.get(key(span.dataset.context ?? '', span.dataset.term ?? ''));
    if (!term) return;
    root.querySelectorAll('.gl-active').forEach((n) => n.classList.remove('gl-active'));
    span.classList.add('gl-active');
    tip.show(span, tipContent(doc, span, term, multi));
  };
  const hide = () => {
    tip.anchor?.classList.remove('gl-active');
    tip.hide();
  };
  const target = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>('.gl-term, .gl-avoid') ?? null;
  wrap.addEventListener('mouseover', (e) => {
    const t = target(e);
    if (t && list.contains(t)) show(t);
  });
  wrap.addEventListener('mouseout', (e) => {
    const a = tip.anchor;
    if (a && target(e) === a && !a.contains(e.relatedTarget as Node | null) && doc.activeElement !== a) hide();
  });
  wrap.addEventListener('focusin', (e) => {
    const t = target(e);
    if (t && list.contains(t)) show(t);
  });
  wrap.addEventListener('focusout', (e) => {
    if (tip.anchor && e.target === tip.anchor) hide();
  });
  wrap.addEventListener('click', (e) => {
    const t = target(e);
    if (t && t.dataset.kind === 'avoid') jumpTo(root, t.dataset.context ?? '', t.dataset.term ?? '');
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tip.anchor) {
      hide();
      return;
    }
    const t = target(e);
    if (t && (e.key === 'Enter' || e.key === ' ') && t.dataset.kind === 'avoid') {
      e.preventDefault();
      jumpTo(root, t.dataset.context ?? '', t.dataset.term ?? '');
    }
  });
}

function renderContext(doc: Document, c: BoundedContext, multi: boolean, limit: number): HTMLElement {
  const section = el(doc, 'section', { class: 'gl-context', 'data-context': c.name });
  const head = el(doc, 'header', { class: 'gl-context-head' });
  if (multi || c.description) head.append(el(doc, 'h2', {}, c.name));
  if (c.source) head.append(el(doc, 'span', { class: 'gl-source', 'data-gl-skip': '' }, c.source));
  const about = c.purpose || c.description;
  if (about) head.append(el(doc, 'p', { class: 'gl-desc', 'data-markup': '' }, about));
  section.append(head);

  const dl = el(doc, 'dl', { class: 'gl-terms' });
  let cluster: string | null = null;
  for (const t of c.terms.slice(0, limit)) {
    if (t.cluster !== cluster) {
      cluster = t.cluster;
      if (cluster) dl.append(el(doc, 'div', { class: 'gl-cluster', role: 'presentation' }, cluster));
    }
    const entry = el(doc, 'div', { class: 'gl-entry', id: entryId(t.context, t.name) });
    entry.append(el(doc, 'dt', {}, termSpan(doc, t.name, 'term', t.name, t.context)));
    entry.append(el(doc, 'dd', { class: 'gl-def', 'data-markup': '' }, t.definition || '(no definition)'));
    if (t.avoid.length) {
      const dd = el(doc, 'dd', { class: 'gl-avoid-list' }, el(doc, 'span', { class: 'gl-avoid-label' }, 'Avoid: '));
      t.avoid.forEach((a, i) => {
        if (i) dd.append(', ');
        dd.append(termSpan(doc, a, 'avoid', t.name, t.context));
      });
      entry.append(dd);
    }
    dl.append(entry);
  }
  section.append(dl);
  return section;
}

function tipContent(doc: Document, span: HTMLElement, term: Term, multi: boolean): Node[] {
  const out: Node[] = [];
  const title = el(doc, 'p', { class: 'gl-tip-title' });
  if (span.dataset.kind === 'avoid') {
    title.append(el(doc, 'span', { class: 'gl-tip-avoided' }, `“${span.textContent}”`), ' is avoided. Use ', el(doc, 'strong', {}, term.name));
  } else {
    title.append(el(doc, 'strong', {}, term.name));
  }
  if (multi) title.append(el(doc, 'span', { class: 'gl-tip-ctx' }, ` · ${term.context}`));
  out.push(title, el(doc, 'p', { class: 'gl-tip-def' }, term.definition || '(no definition)'));
  if (span.dataset.kind === 'avoid') out.push(el(doc, 'p', { class: 'gl-tip-meta' }, `Click to jump to ${term.name}.`));
  else if (term.avoid.length) out.push(el(doc, 'p', { class: 'gl-tip-meta' }, `Avoid: ${term.avoid.join(', ')}`));
  return out;
}

function jumpTo(root: HTMLElement, context: string, term: string) {
  const entry = root.ownerDocument.getElementById(entryId(context, term));
  if (!entry || !root.contains(entry)) return;
  entry.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  entry.classList.remove('gl-flash');
  void entry.offsetWidth; // restart the animation
  entry.classList.add('gl-flash');
  entry.querySelector<HTMLElement>('dt .gl-term')?.focus({ preventScroll: true });
}

const key = (context: string, term: string) => `${context}\u0000${term}`;
const entryId = (context: string, term: string) => `gl-${slug(context)}--${slug(term)}`;
const slug = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-');

function el(doc: Document, tag: string, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElement {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}
