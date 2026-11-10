// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DomainModel } from '../model/types.js';
import { loadDomain } from '../parsers/index.js';
import { inlineSource } from '../sources/inline.js';
import { createShell, type HostAdapter } from './shell.js';
import type { DisplayMode } from './views/index.js';
import { ADR_INLINE_LIMIT } from './views/home/home-view.js';

vi.mock('./views/glossary/glossary.css', () => ({}));
vi.mock('./views/home/home.css', () => ({}));
vi.mock('./views/adr/adr.css', () => ({}));
vi.mock('./views/shared/terms.css', () => ({}));
vi.mock('./views/shared/chat.css', () => ({}));

const fixture = join(import.meta.dirname, '../../fixtures/single-context');
const files = ['GLOSSARY.md', 'docs/adr/0001-invoices-are-immutable.md', 'docs/adr/0002-payments-settle-oldest-invoice-first.md'].map((p) => ({
  path: p,
  content: readFileSync(join(fixture, p), 'utf8'),
}));

let model: DomainModel;
let root: HTMLElement;
let mode: DisplayMode;
let host: HostAdapter;

beforeEach(async () => {
  model = await loadDomain(inlineSource(files), { project: 'Acme Billing' });
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
  window.scrollTo = vi.fn() as typeof window.scrollTo; // not implemented in jsdom
  mode = 'inline';
  host = {
    displayMode: () => mode,
    availableDisplayModes: () => ['inline', 'fullscreen'],
    requestDisplayMode: vi.fn(async (m: DisplayMode) => (mode = m)),
    openLink: vi.fn<(url: string) => void>(),
  };
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const show = (view: 'home' | 'glossary' = 'home') => {
  const shell = createShell(root, host);
  shell.showPayload({ view, source: 'fixtures/single-context', model });
  return shell;
};
const adrRow = (n: string) => root.querySelector<HTMLButtonElement>(`.hm-row[data-adr$="${n}"]`)!;

describe('Home', () => {
  it('shows the project name and its artifacts', () => {
    show();
    expect(root.querySelector('h1')!.textContent).toBe('Acme Billing');
    expect(root.querySelector('.hm-heading')!.textContent).toBe('Artifacts');
    expect(root.querySelector('[data-artifact="glossary"] .hm-row-meta')!.textContent).toBe('1 context · 4 terms');
    const rows = [...root.querySelectorAll('.hm-row[data-adr]')].map((r) => [
      r.querySelector('.hm-num')!.textContent,
      r.querySelector('.hm-title-text')!.textContent,
      r.querySelector('.dv-status')!.textContent,
    ]);
    expect(rows).toEqual([
      ['0001', 'Invoices are immutable once sent', 'accepted'],
      ['0002', 'Payments settle the oldest Invoice first', 'proposed'],
    ]);
    expect(adrRow('0001-invoices-are-immutable.md').querySelector('.hm-summary')!.textContent).toMatch(/^Once an Invoice is sent/);
    expect(root.querySelector('.hm-group')).toBeNull(); // all Project-wide: no group labels
    expect(root.querySelector('.dv-back')).toBeNull();
  });

  it('groups ADRs by Bounded Context, Project-wide first', async () => {
    model.adrs = [
      { ...model.adrs[0]!, path: 'src/billing/docs/adr/0001-a.md', context: 'Billing' },
      { ...model.adrs[1]!, context: null },
    ];
    show();
    expect([...root.querySelectorAll('.hm-group')].map((g) => g.textContent)).toEqual(['Project-wide', 'Billing']);
  });

  it('caps ADR rows inline and asks for full screen to show the rest', () => {
    model.adrs = Array.from({ length: ADR_INLINE_LIMIT + 3 }, (_, i) => ({ ...model.adrs[0]!, path: `docs/adr/${i}.md`, number: i }));
    show();
    expect(root.querySelectorAll('.hm-row[data-adr]')).toHaveLength(ADR_INLINE_LIMIT);
    root.querySelector<HTMLButtonElement>('.hm-more')!.click();
    expect(host.requestDisplayMode).toHaveBeenCalledWith('fullscreen');
  });

  it('says so when there is no glossary', () => {
    model.contexts = [];
    show();
    expect(root.querySelector('.hm-row-empty')!.textContent).toContain('No glossary files found.');
  });

  it('opens the Glossary and comes back', () => {
    show();
    root.querySelector<HTMLButtonElement>('[data-artifact="glossary"]')!.click();
    return flush().then(() => {
      expect(root.querySelector('.gl-view')).not.toBeNull();
      expect(host.requestDisplayMode).not.toHaveBeenCalled();
      root.querySelector<HTMLButtonElement>('.dv-back')!.click();
      return flush();
    }).then(() => expect(root.querySelector('.hm-artifacts')).not.toBeNull());
  });

  it('offers "Chat about this" on ADR rows, not on the Glossary row', () => {
    model.adrs = [model.adrs[0]!, { ...model.adrs[1]!, number: null, title: 'Unnumbered decision' }];
    show();
    expect(root.querySelector('[data-artifact="glossary"]')!.closest('li')!.querySelector('.dv-chat-btn')).toBeNull();
    const item = (n: string) => adrRow(n).closest('li')!;
    const chat = (n: string) => item(n).querySelector<HTMLButtonElement>('.dv-chat-btn')!;

    chat('0001-invoices-are-immutable.md').click();
    expect(host.requestDisplayMode).not.toHaveBeenCalled(); // the row itself wasn't opened
    expect(item('0001-invoices-are-immutable.md').querySelector('.dv-chat-text')!.textContent).toBe(
      'I want to ask about the ADR 0001-Invoices are immutable once sent',
    );
    chat('0002-payments-settle-oldest-invoice-first.md').click();
    expect(root.querySelectorAll('.dv-chat-box')).toHaveLength(1);
    expect(item('0002-payments-settle-oldest-invoice-first.md').querySelector('.dv-chat-text')!.textContent).toBe(
      'I want to ask about the ADR Unnumbered decision',
    );
  });

  it('opens on the Glossary when the tool asked for it', () => {
    show('glossary');
    expect(root.querySelector('.gl-view')).not.toBeNull();
  });
});

describe('ADR page', () => {
  const open = async (n = '0001-invoices-are-immutable.md') => {
    show();
    adrRow(n).click();
    await flush();
  };

  it('asks for full screen and renders the Markdown', async () => {
    await open();
    expect(host.requestDisplayMode).toHaveBeenCalledWith('fullscreen');
    expect(root.querySelector('.adr-title')!.textContent).toBe('Invoices are immutable once sent');
    expect(root.querySelector('.adr-kicker')!.textContent).toContain('ADR 0001');
    const prose = root.querySelector('.adr-prose')!;
    expect([...prose.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Considered options', 'Consequences']);
    expect(prose.querySelector('.adr-table table th')!.textContent).toBe('Change requested');
    expect(prose.querySelector('pre code')!.textContent).toContain('settle(invoiceId');
  });

  it('never runs raw HTML from the file', async () => {
    await open();
    const prose = root.querySelector('.adr-prose')!;
    expect(prose.querySelector('script')).toBeNull();
    expect(prose.textContent).toContain("<script>alert('raw html is shown as text, never run')</script>");
    expect(prose.textContent).not.toContain('reviewed 2026-10'); // HTML comment dropped
  });

  it('marks Terms and Avoided Words, but not inside code or links', async () => {
    await open();
    const prose = root.querySelector('.adr-prose')!;
    const marked = (cls: string) => [...prose.querySelectorAll(`.${cls}`)].map((s) => s.textContent);
    expect(marked('gl-term')).toEqual(expect.arrayContaining(['Invoice', 'Customer', 'Refund', 'Payment']));
    expect(marked('gl-avoid')).toEqual(expect.arrayContaining(['bill', 'client', 'payment request', 'transaction']));
    expect(prose.querySelector('code .gl-term, pre .gl-term, a .gl-term')).toBeNull();
  });

  it('shows a tooltip on hover and does nothing on click', async () => {
    await open();
    const tip = document.querySelector<HTMLElement>('.gl-tip')!;
    const bill = [...root.querySelectorAll<HTMLElement>('.adr-prose .gl-avoid')].find((s) => s.textContent === 'bill')!;
    bill.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toMatch(/“bill” is avoided\. Use Invoice/);
    expect(tip.textContent).not.toMatch(/Click/);
    const before = root.innerHTML;
    bill.click();
    expect(root.innerHTML).toBe(before);
    bill.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: root }));
    expect(tip.hidden).toBe(true);
  });

  it('opens linked ADRs in the panel and external links through the host', async () => {
    await open();
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.adr-prose a')];
    const glossary = links.find((a) => a.textContent === 'GLOSSARY')!;
    expect(glossary.classList.contains('adr-link-local')).toBe(true); // not an ADR: inert
    links.find((a) => a.textContent === '0002')!.click();
    await flush();
    expect(root.querySelector('.adr-title')!.textContent).toBe('Payments settle the oldest Invoice first');
    expect(root.querySelector('.adr-prose blockquote')).not.toBeNull();
  });

  it('offers "Chat about this" on the ADR title', async () => {
    await open();
    const head = root.querySelector<HTMLElement>('.adr-head')!;
    head.querySelector<HTMLButtonElement>('.dv-chat-btn')!.click();
    expect(head.querySelector('.dv-chat-text')!.textContent).toBe('I want to ask about the ADR 0001-Invoices are immutable once sent');
    expect(root.querySelector('.adr-prose .dv-chat-btn')).toBeNull();
  });

  it('goes back to Home', async () => {
    await open();
    root.querySelector<HTMLButtonElement>('.dv-back')!.click();
    await flush();
    expect(root.querySelector('h1')!.textContent).toBe('Acme Billing');
    expect(mode).toBe('fullscreen'); // leaving full screen stays the user's choice
  });
});
