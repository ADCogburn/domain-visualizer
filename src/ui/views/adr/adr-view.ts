import { buildIndex } from '../../../model/term-index.js';
import { adrNumber, type Adr, type DomainModel } from '../../../model/types.js';
import { statusBadge } from '../shared/badge.js';
import { markup } from '../shared/highlight.js';
import { attachTermTooltips } from '../shared/term-hover.js';
import type { DomainView, ViewContext } from '../types.js';
import { renderMarkdown } from './markdown.js';
import './adr.css';

/**
 * One ADR's Markdown as HTML. Glossary Terms in the prose are underlined and Avoided
 * Words greyed, preferring the ADR's own Bounded Context; hovering or focusing one shows
 * its definition in the shared tooltip. Clicking a Term does nothing.
 */
export const adrView: DomainView = {
  id: 'adr',
  title: 'ADR',
  render(root, model, ctx) {
    const doc = root.ownerDocument;
    const path = ctx.route.view === 'adr' ? ctx.route.adr : '';
    const adr = (model.adrs ?? []).find((a) => a.path === path);
    if (!adr) {
      root.append(el(doc, 'p', { class: 'adr-missing' }, path ? `${path} is not one of this project's ADRs.` : 'No ADR selected.'));
      return;
    }

    const article = el(doc, 'article', { class: `adr-view ${ctx.displayMode === 'fullscreen' ? 'adr-full' : 'adr-inline'}` });
    article.append(head(doc, adr));

    const prose = el(doc, 'div', { class: 'adr-prose' });
    prose.innerHTML = renderMarkdown(adr.body);
    if (!adr.body.trim()) prose.append(el(doc, 'p', { class: 'adr-empty' }, 'This ADR has no text after its title.'));
    for (const table of prose.querySelectorAll('table')) table.replaceWith(el(doc, 'div', { class: 'adr-table' }, table.cloneNode(true)));
    wireLinks(prose, adr, model, ctx);
    article.append(prose);
    root.append(article);

    markup(prose, buildIndex(model), { context: adr.context ?? undefined });
    attachTermTooltips(article, prose, model);
  },
};

function head(doc: Document, adr: Adr): HTMLElement {
  const header = el(doc, 'header', { class: 'adr-head' });
  const kicker = el(doc, 'p', { class: 'adr-kicker' }, adr.number === null ? 'ADR' : `ADR ${adrNumber(adr.number)}`);
  if (adr.context) kicker.append(el(doc, 'span', { class: 'adr-ctx' }, ` · ${adr.context}`));
  if (adr.status) kicker.append(statusBadge(doc, adr.status));
  header.append(kicker, el(doc, 'h1', { class: 'adr-title' }, adr.title), el(doc, 'p', { class: 'adr-path' }, adr.path));
  return header;
}

/** External links open through the host; links to another ADR open it here; other local links stay inert. */
function wireLinks(prose: HTMLElement, adr: Adr, model: DomainModel, ctx: ViewContext) {
  const known = new Set((model.adrs ?? []).map((a) => a.path));
  for (const a of prose.querySelectorAll<HTMLAnchorElement>('a[data-href]')) {
    const raw = a.dataset.href ?? '';
    const target = raw.startsWith('#') ? null : resolve(adr.path, raw);
    if (target && known.has(target)) a.dataset.adr = target;
    else {
      a.classList.add('adr-link-local');
      a.removeAttribute('href');
      a.title ||= raw;
    }
  }
  prose.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a');
    if (!a || !prose.contains(a)) return;
    e.preventDefault();
    if (a.hasAttribute('data-external')) ctx.openLink(a.href);
    else if (a.dataset.adr) ctx.navigate({ view: 'adr', adr: a.dataset.adr });
  });
}

/** Resolve a relative link against the file it appears in; null if it climbs out of the repo. */
function resolve(fromFile: string, target: string): string | null {
  let clean = target.split('#')[0]!.split('?')[0]!;
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Keep it as written.
  }
  if (!clean) return null;
  const parts = clean.startsWith('/') ? [] : fromFile.split('/').slice(0, -1);
  for (const seg of clean.replace(/^\/+/, '').split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(seg);
  }
  return parts.join('/');
}

function el(doc: Document, tag: string, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElement {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}
