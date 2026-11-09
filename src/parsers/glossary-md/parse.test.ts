import { describe, expect, it } from 'vitest';
import { parseGlossary, parseGlossaryMap } from './parse.js';

import { billing, identity } from '../../test-support/glossary-samples.js';

// Ported from seed/test.js; every assertion there is kept below.
describe('parseGlossary', () => {
  const b = parseGlossary(billing);

  it('reads the context name and description from the preamble', () => {
    expect(b.context).toBe('Billing');
    expect(b.description).toBe('Generates invoices and collects payment for fulfilled orders.');
  });

  it('reads every term in order', () => {
    expect(b.terms.map((t) => t.name)).toEqual(['Invoice', 'Customer', 'Payment', 'Refund']);
  });

  it('splits _Avoid_ lists on commas', () => {
    expect(b.terms[0]!.avoid).toEqual(['Bill', 'payment request']);
  });

  it('groups terms under cluster subheadings', () => {
    expect(b.terms[0]!.cluster).toBe('Invoicing');
    expect(b.terms[2]!.cluster).toBe('Payments');
  });

  it('joins an inline definition with following lines', () => {
    expect(b.terms[2]!.definition).toBe('Money received against one or more invoices. It can be partial.');
  });

  it('accepts *Avoid*: spelling', () => {
    expect(b.terms[2]!.avoid).toEqual(['transaction']);
  });

  it('accepts a colon inside the bold and defaults avoid to []', () => {
    expect(b.terms[3]!.name).toBe('Refund');
    expect(b.terms[3]!.avoid).toEqual([]);
  });

  it('produces no warnings for a well-formed file', () => {
    expect(b.warnings).toEqual([]);
  });

  it('stamps each term with its context and source line', () => {
    expect(b.terms.every((t) => t.context === 'Billing')).toBe(true);
    expect(b.terms[0]!.line).toBe(9);
  });

  it('ignores non-Language sections for terms but records term relationships', () => {
    expect(b.relationships).toEqual([
      { kind: 'term', context: 'Billing', description: 'An Invoice belongs to exactly one Customer', terms: ['Invoice', 'Customer'] },
    ]);
  });

  it('lets the caller override the context name', () => {
    expect(parseGlossary(billing, { context: 'Invoicing' }).terms[0]!.context).toBe('Invoicing');
  });

  it('accepts Avoid: and _Avoid:_ spellings and semicolons', () => {
    const g = parseGlossary(`# X\n\n## Language\n\n**A**:\nDef.\nAvoid: one; two\n\n**B**:\nDef.\n_Avoid:_ three`);
    expect(g.terms[0]!.avoid).toEqual(['one', 'two']);
    expect(g.terms[1]!.avoid).toEqual(['three']);
  });

  it('keeps an entry open for a late _Avoid_ line after a blank line', () => {
    const g = parseGlossary(`# X\n\n## Language\n\n**A**:\nDef.\n\n_Avoid_: late\n`);
    expect(g.terms[0]!.avoid).toEqual(['late']);
    expect(g.warnings).toEqual([]);
  });

  it('warns about missing definitions and stray text', () => {
    const g = parseGlossary(`# X\n\n## Language\n\nstray\n\n**A**:\n\n**B**:\nDef.\n\nmore stray\n`);
    expect(g.warnings).toEqual(['line 5: text outside any term entry', 'line 7: "A" has no definition', 'line 12: text outside any term entry']);
  });

  it('warns about and ignores a second H1', () => {
    const g = parseGlossary(`${billing}\n# Identity\n\n## Language\n\n**Account**:\nA login.\n`);
    expect(g.context).toBe('Billing');
    expect(g.warnings[0]).toMatch(/second H1 "Identity" ignored/);
  });

  it('handles CRLF line endings', () => {
    expect(parseGlossary(billing.replace(/\n/g, '\r\n')).terms).toHaveLength(4);
  });
});

describe('parseGlossaryMap', () => {
  const map = parseGlossaryMap(`# Glossary map

## Contexts

- [Billing](./src/billing/GLOSSARY.md): generates invoices and processes payments
- [Identity](./src/identity/GLOSSARY.md): logins and permissions

## Relationships

- **Ordering → Fulfillment**: Ordering emits \`OrderPlaced\` events
- **Ordering <-> Billing**: Shared types for \`CustomerId\`
- **Billing <- Identity**: Identity supplies accounts
- not a relationship
`);

  it('reads context entries', () => {
    expect(map.entries[0]).toEqual({ context: 'Billing', path: './src/billing/GLOSSARY.md', purpose: 'generates invoices and processes payments' });
    expect(map.entries).toHaveLength(2);
  });

  it('reads directed, bidirectional and reversed relationships', () => {
    expect(map.relationships).toEqual([
      { kind: 'context', from: 'Ordering', to: 'Fulfillment', bidirectional: false, description: 'Ordering emits OrderPlaced events' },
      { kind: 'context', from: 'Ordering', to: 'Billing', bidirectional: true, description: 'Shared types for CustomerId' },
      { kind: 'context', from: 'Identity', to: 'Billing', bidirectional: false, description: 'Identity supplies accounts' },
    ]);
  });

  it('warns about malformed relationship bullets', () => {
    expect(map.warnings).toEqual(['line 13: relationship not in "- **A → B**: description" form']);
  });
});
