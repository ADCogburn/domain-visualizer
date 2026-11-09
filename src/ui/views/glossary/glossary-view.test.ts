// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildIndex } from '../../../model/term-index.js';
import type { DomainModel } from '../../../model/types.js';
import { loadDomain } from '../../../parsers/index.js';
import { inlineSource } from '../../../sources/inline.js';
import { billing, identity } from '../../../test-support/glossary-samples.js';
import type { ViewContext } from '../types.js';
import { glossaryView, INLINE_LIMIT } from './glossary-view.js';
import { markup } from '../shared/highlight.js';

vi.mock('./glossary.css', () => ({}));
vi.mock('../shared/terms.css', () => ({}));

let model: DomainModel;
beforeEach(async () => {
  model = await loadDomain(
    inlineSource([
      { path: 'GLOSSARY-MAP.md', content: '## Contexts\n\n- [Billing](billing/GLOSSARY.md): money\n- [Identity](identity/GLOSSARY.md): logins\n' },
      { path: 'billing/GLOSSARY.md', content: billing },
      { path: 'identity/GLOSSARY.md', content: identity },
    ]),
  );
  document.body.innerHTML = '';
});

const ctx = (over: Partial<ViewContext> = {}): ViewContext => ({
  displayMode: 'inline',
  canFullscreen: true,
  requestDisplayMode: vi.fn(async () => {}),
  route: { view: 'glossary' },
  navigate: vi.fn(),
  openLink: vi.fn(),
  ...over,
});

describe('markup', () => {
  it('wraps terms and avoided words, skipping code and existing spans', () => {
    const div = document.createElement('div');
    div.innerHTML = 'Send the payment request to the Customer. <code>Invoice</code> and Clients.';
    markup(div, buildIndex(model), { context: 'Billing' });
    const spans = [...div.querySelectorAll('span')].map((s) => [s.textContent, s.className, s.dataset.term]);
    expect(spans).toEqual([
      ['payment request', 'gl-avoid', 'Invoice'],
      ['Customer', 'gl-term', 'Customer'],
      ['Clients', 'gl-avoid', 'Customer'],
    ]);
    expect(div.querySelector('code')!.textContent).toBe('Invoice');
    markup(div, buildIndex(model));
    expect(div.querySelectorAll('span')).toHaveLength(3);
  });
});

describe('glossaryView', () => {
  it('renders every context and term with avoid lists in full screen', () => {
    const root = document.createElement('div');
    glossaryView.render(root, model, ctx({ displayMode: 'fullscreen' }));
    expect([...root.querySelectorAll('.gl-context h2')].map((h) => h.textContent)).toEqual(['Billing', 'Identity']);
    expect([...root.querySelectorAll('dt .gl-term')].map((s) => s.textContent)).toEqual(['Invoice', 'Customer', 'Payment', 'Refund', 'Account']);
    expect([...root.querySelectorAll('.gl-avoid-list')[0]!.querySelectorAll('.gl-avoid')].map((s) => s.textContent)).toEqual(['Bill', 'payment request']);
    expect(root.querySelector('.gl-rels')).not.toBeNull();
  });

  it('marks terms inside definitions in the context they belong to', () => {
    const root = document.createElement('div');
    glossaryView.render(root, model, ctx({ displayMode: 'fullscreen' }));
    // Billing's Invoice definition mentions "customer" -> canonical term
    const def = root.querySelector('#gl-billing--invoice .gl-def')!;
    expect([...def.querySelectorAll('.gl-term')].map((s) => s.textContent)).toEqual(['payment', 'customer']);
    // Identity's Account definition: "customer" is a Billing term, still underlined
    expect(root.querySelector('#gl-identity--account .gl-def .gl-term')!.textContent).toBe('customer');
  });

  it('shows the definition in a tooltip on hover or focus, and redirects avoided words', () => {
    const root = document.createElement('div');
    document.body.append(root);
    glossaryView.render(root, model, ctx({ displayMode: 'fullscreen' }));
    const tip = document.querySelector<HTMLElement>('.gl-tip')!;
    expect(tip.hidden).toBe(true);
    expect(tip.getAttribute('role')).toBe('tooltip');

    const invoice = root.querySelector<HTMLElement>('#gl-billing--invoice dt .gl-term')!;
    invoice.focus();
    expect(tip.hidden).toBe(false);
    expect(invoice.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.querySelector('strong')!.textContent).toBe('Invoice');
    expect(tip.textContent).toContain('A request for payment sent to a customer after delivery.');

    invoice.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(tip.hidden).toBe(true);
    expect(invoice.hasAttribute('aria-describedby')).toBe(false);
    invoice.blur();

    const bill = [...root.querySelectorAll<HTMLElement>('.gl-avoid')].find((s) => s.textContent === 'Bill')!;
    bill.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toMatch(/“Bill” is avoided\. Use Invoice/);
    bill.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: root }));
    expect(tip.hidden).toBe(true);

    bill.click();
    expect(document.activeElement!.textContent).toBe('Invoice');
    expect(root.querySelector('#gl-billing--invoice')!.classList.contains('gl-flash')).toBe(true);
  });

  it('keeps one tooltip per document across re-renders', () => {
    const root = document.createElement('div');
    document.body.append(root);
    glossaryView.render(root, model, ctx());
    root.querySelector<HTMLButtonElement>('.gl-more')?.click();
    glossaryView.render(root, model, ctx({ displayMode: 'fullscreen' }));
    expect(document.querySelectorAll('.gl-tip')).toHaveLength(1);
  });

  it('caps inline cards and asks for full screen to show the rest', () => {
    const many: DomainModel = {
      ...model,
      contexts: [{ ...model.contexts[0]!, terms: Array.from({ length: 12 }, (_, i) => ({ ...model.contexts[0]!.terms[0]!, name: `T${i}` })) }],
    };
    const root = document.createElement('div');
    const c = ctx();
    glossaryView.render(root, many, c);
    expect(root.querySelectorAll('.gl-entry')).toHaveLength(INLINE_LIMIT);
    root.querySelector<HTMLButtonElement>('.gl-more')!.click();
    expect(c.requestDisplayMode).toHaveBeenCalledWith('fullscreen');
  });

  it('expands in place when the host has no full screen', () => {
    const many: DomainModel = {
      ...model,
      contexts: [{ ...model.contexts[0]!, terms: Array.from({ length: 12 }, (_, i) => ({ ...model.contexts[0]!.terms[0]!, name: `T${i}` })) }],
    };
    const root = document.createElement('div');
    glossaryView.render(root, many, ctx({ canFullscreen: false }));
    root.querySelector<HTMLButtonElement>('.gl-more')!.click();
    expect(root.querySelectorAll('.gl-entry')).toHaveLength(12);
    expect(root.querySelector('.gl-more')).toBeNull();
  });
});
