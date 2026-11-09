import { describe, expect, it } from 'vitest';
import { parseGlossary } from '../parsers/glossary-md/parse.js';
import { billing, identity } from '../test-support/glossary-samples.js';
import { buildIndex, lookup, preferredEntry } from './term-index.js';
import type { BoundedContext } from './types.js';

const ctx = (md: string): BoundedContext => {
  const g = parseGlossary(md);
  return { name: g.context, description: g.description, purpose: '', source: null, terms: g.terms };
};

// Ported from seed/test.js.
describe('buildIndex / lookup', () => {
  const index = buildIndex([ctx(billing), ctx(identity)]);

  it('looks up plurals case-insensitively', () => {
    expect(lookup(index, 'Invoices')[0]!.term).toBe('Invoice');
    expect(lookup(index, 'bills')[0]!.kind).toBe('avoid');
    expect(lookup(index, 'Payment request')[0]!.term).toBe('Invoice');
  });

  it('looks up possessives and -es plurals', () => {
    expect(lookup(index, "Customer's")[0]!.term).toBe('Customer');
    expect(lookup(index, 'Payment\n  requests')[0]!.term).toBe('Invoice');
  });

  it('prefers entries from the given context', () => {
    // "account" is avoided in Billing but canonical in Identity
    expect(lookup(index, 'account', 'Billing')[0]!.kind).toBe('avoid');
    expect(lookup(index, 'account', 'Identity')[0]!.kind).toBe('term');
  });

  it('prefers the canonical term when a phrase is both', () => {
    expect(preferredEntry(lookup(index, 'account'))!.kind).toBe('term');
  });

  it('matches the longest phrase first', () => {
    index.regex!.lastIndex = 0;
    expect('Send the payment request and log the payment.'.match(index.regex!)).toEqual(['payment request', 'payment']);
  });

  it('does not match inside other words', () => {
    expect('Billboard accountant'.match(index.regex!)).toBeNull();
  });

  it('returns no regex for an empty model', () => {
    expect(buildIndex([]).regex).toBeNull();
    expect(lookup(buildIndex([]), 'x')).toEqual([]);
  });
});
