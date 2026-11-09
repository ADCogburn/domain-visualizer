import { adrNumber, countTerms, type Adr, type DomainModel } from '../../../model/types.js';
import { statusBadge } from '../shared/badge.js';
import type { DomainView, ViewContext } from '../types.js';
import './home.css';

/** How many ADR rows an inline card shows before offering "Show all". */
export const ADR_INLINE_LIMIT = 5;

/**
 * Home: the Project's Artifacts. The Glossary is one row; each ADR is a row with its
 * number, title, status and first paragraph. Rows open their page inside the panel.
 */
export const homeView: DomainView = {
  id: 'home',
  title: 'Home',
  render(root, model, ctx) {
    let expanded = false;
    const draw = () => {
      root.replaceChildren();
      renderHome(root, model, ctx, expanded, () => {
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

function renderHome(root: HTMLElement, model: DomainModel, ctx: ViewContext, expanded: boolean, onShowAll: () => void) {
  const doc = root.ownerDocument;
  const section = el(doc, 'section', { class: 'hm-artifacts', 'aria-labelledby': 'hm-artifacts-h' });
  section.append(el(doc, 'h2', { class: 'hm-heading', id: 'hm-artifacts-h' }, 'Artifacts'));

  const list = el(doc, 'ul', { class: 'hm-list' });
  list.append(el(doc, 'li', {}, glossaryRow(doc, model, ctx)));
  section.append(list);

  const adrs = model.adrs ?? [];
  if (adrs.length) {
    const limit = ctx.displayMode === 'fullscreen' || expanded ? Infinity : ADR_INLINE_LIMIT;
    const head = el(doc, 'h3', { class: 'hm-subheading' }, 'Architecture decisions');
    head.append(el(doc, 'span', { class: 'hm-count' }, String(adrs.length)));
    section.append(head);

    const groups = groupAdrs(adrs);
    const labelled = groups.length > 1 || groups[0]![0] !== null;
    let shown = 0;
    for (const [context, items] of groups) {
      if (shown >= limit) break;
      if (labelled) section.append(el(doc, 'p', { class: 'hm-group' }, context ?? 'Project-wide'));
      const ul = el(doc, 'ul', { class: 'hm-list' });
      for (const a of items.slice(0, limit - shown)) ul.append(el(doc, 'li', {}, adrRow(doc, a, ctx)));
      shown += Math.min(items.length, limit - shown);
      section.append(ul);
    }
    if (shown < adrs.length) {
      const more = el(doc, 'button', { class: 'hm-more', type: 'button' }, `Show all ${adrs.length} decisions`);
      more.addEventListener('click', onShowAll);
      section.append(more);
    }
  }
  root.append(section);
}

function glossaryRow(doc: Document, model: DomainModel, ctx: ViewContext): HTMLElement {
  const c = model.contexts.length;
  if (!c) {
    return el(doc, 'div', { class: 'hm-row hm-row-empty' }, rowTitle(doc, 'Glossary'), el(doc, 'p', { class: 'hm-row-meta' }, 'No glossary files found.'));
  }
  const n = countTerms(model);
  const w = model.warnings.length;
  const meta = [`${c} context${c === 1 ? '' : 's'}`, `${n} term${n === 1 ? '' : 's'}`];
  if (w) meta.push(`${w} warning${w === 1 ? '' : 's'}`);
  const row = el(doc, 'button', { type: 'button', class: 'hm-row', 'data-artifact': 'glossary' }, rowTitle(doc, 'Glossary'), el(doc, 'p', { class: 'hm-row-meta' }, meta.join(' · ')));
  row.addEventListener('click', () => ctx.navigate({ view: 'glossary' }));
  return row;
}

function adrRow(doc: Document, a: Adr, ctx: ViewContext): HTMLElement {
  const title = el(doc, 'span', { class: 'hm-row-title' });
  if (a.number !== null) title.append(el(doc, 'span', { class: 'hm-num' }, adrNumber(a.number)));
  title.append(el(doc, 'span', { class: 'hm-title-text' }, a.title));
  if (a.status) title.append(statusBadge(doc, a.status));
  const row = el(doc, 'button', { type: 'button', class: 'hm-row', 'data-adr': a.path, title: a.path }, title);
  if (a.summary) row.append(el(doc, 'p', { class: 'hm-summary' }, a.summary));
  row.addEventListener('click', () => ctx.navigate({ view: 'adr', adr: a.path }, { fullscreen: true }));
  return row;
}

/** Project-wide ADRs first, then each Bounded Context in first-seen order. */
function groupAdrs(adrs: Adr[]): [string | null, Adr[]][] {
  const groups = new Map<string | null, Adr[]>([[null, []]]);
  for (const a of adrs) {
    if (!groups.has(a.context)) groups.set(a.context, []);
    groups.get(a.context)!.push(a);
  }
  return [...groups].filter(([, items]) => items.length);
}

const rowTitle = (doc: Document, text: string) => el(doc, 'span', { class: 'hm-row-title' }, el(doc, 'span', { class: 'hm-title-text' }, text));

function el(doc: Document, tag: string, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElement {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}
