import type { DomainModel, Term } from '../../../model/types.js';
import { createTooltip, type Tooltip } from './tooltip.js';
import './terms.css';

export interface TermTooltipOptions {
  /** Extra line under an avoided word's definition, e.g. what clicking it does. */
  avoidHint?(term: Term): string | null;
}

/**
 * Show a Term's definition in a tooltip when a `.gl-term` / `.gl-avoid` span inside
 * `scope` is hovered or focused; hide it on mouse-out, blur and Escape. Listeners sit
 * on `wrap`. Returns the tooltip so a view can add its own click behaviour.
 */
export function attachTermTooltips(wrap: HTMLElement, scope: HTMLElement, model: DomainModel, opts: TermTooltipOptions = {}): Tooltip {
  const doc = wrap.ownerDocument;
  const terms = new Map<string, Term>();
  for (const c of model.contexts) for (const t of c.terms) terms.set(termKey(t.context, t.name), t);
  const multi = model.contexts.length > 1;

  const tip = createTooltip(doc);
  const show = (span: HTMLElement) => {
    const term = terms.get(termKey(span.dataset.context ?? '', span.dataset.term ?? ''));
    if (!term) return;
    wrap.querySelectorAll('.gl-active').forEach((n) => n.classList.remove('gl-active'));
    span.classList.add('gl-active');
    tip.show(span, tipContent(doc, span, term, multi, opts));
  };
  const hide = () => {
    tip.anchor?.classList.remove('gl-active');
    tip.hide();
  };
  const target = (e: Event) => termTarget(e);

  wrap.addEventListener('mouseover', (e) => {
    const t = target(e);
    if (t && scope.contains(t)) show(t);
  });
  wrap.addEventListener('mouseout', (e) => {
    const a = tip.anchor;
    if (a && target(e) === a && !a.contains(e.relatedTarget as Node | null) && doc.activeElement !== a) hide();
  });
  wrap.addEventListener('focusin', (e) => {
    const t = target(e);
    if (t && scope.contains(t)) show(t);
  });
  wrap.addEventListener('focusout', (e) => {
    if (tip.anchor && e.target === tip.anchor) hide();
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tip.anchor) hide();
  });
  return tip;
}

/** The glossary span an event happened on, if any. */
export function termTarget(e: Event): HTMLElement | null {
  return (e.target as Element | null)?.closest?.<HTMLElement>('.gl-term, .gl-avoid') ?? null;
}

export const termKey = (context: string, term: string) => `${context}\u0000${term}`;

function tipContent(doc: Document, span: HTMLElement, term: Term, multi: boolean, opts: TermTooltipOptions): Node[] {
  const out: Node[] = [];
  const title = el(doc, 'p', 'gl-tip-title');
  if (span.dataset.kind === 'avoid') {
    title.append(el(doc, 'span', 'gl-tip-avoided', `“${span.textContent}”`), ' is avoided. Use ', el(doc, 'strong', '', term.name));
  } else {
    title.append(el(doc, 'strong', '', term.name));
  }
  if (multi) title.append(el(doc, 'span', 'gl-tip-ctx', ` · ${term.context}`));
  out.push(title, el(doc, 'p', 'gl-tip-def', term.definition || '(no definition)'));
  const hint = span.dataset.kind === 'avoid' ? opts.avoidHint?.(term) : null;
  if (hint) out.push(el(doc, 'p', 'gl-tip-meta', hint));
  else if (span.dataset.kind !== 'avoid' && term.avoid.length) out.push(el(doc, 'p', 'gl-tip-meta', `Avoid: ${term.avoid.join(', ')}`));
  return out;
}

function el(doc: Document, tag: string, cls: string, text?: string): HTMLElement {
  const n = doc.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
