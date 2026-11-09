import { describe, expect, it } from 'vitest';
import { isAdrPath } from './load.js';
import { parseAdr, plain } from './parse.js';

describe('parseAdr', () => {
  it('reads status frontmatter, number, title, summary and body', () => {
    const a = parseAdr(
      'docs/adr/0007-use-postgres.md',
      '﻿---\r\nstatus: "superseded by ADR-0009"\r\ndate: 2026-01-01\r\n---\r\n\r\n# Use **Postgres**\r\n\r\nWe need [SQL](https://x) and `joins`.\r\nIt is _boring_.\r\n\r\n## Consequences\r\n\r\n- ops\r\n',
    );
    expect(a).toEqual({
      number: 7,
      title: 'Use Postgres',
      status: 'superseded by ADR-0009',
      summary: 'We need SQL and joins. It is boring.',
      body: 'We need [SQL](https://x) and `joins`.\nIt is _boring_.\n\n## Consequences\n\n- ops',
    });
  });

  it('drops a number the title repeats', () => {
    expect(parseAdr('docs/adr/0001-x.md', '# 1. One Invoice per Order\n').title).toBe('One Invoice per Order');
    expect(parseAdr('docs/adr/0001-x.md', '# ADR-0001: Split it\n').title).toBe('Split it');
  });

  it('falls back to the filename when there is no H1', () => {
    const a = parseAdr('docs/adr/0012-retry-webhooks.md', 'Status: accepted\n\nRetry three times.\n');
    expect(a).toMatchObject({ number: 12, title: 'Retry webhooks', status: null, summary: 'Retry three times.' });
    expect(parseAdr('docs/adr/no-number.md', '').number).toBeNull();
  });

  it('skips headings, lists, quotes and code when picking the summary', () => {
    const a = parseAdr('docs/adr/1-a.md', '# A\n\n## Context\n\n> quote\n\n```\nfirst para?\n\nstill code\n```\n\n- list\n\nThe real one.\n');
    expect(a.summary).toBe('The real one.');
  });
});

describe('plain', () => {
  it('keeps snake_case and strips emphasis', () => {
    expect(plain('use *the* order_id and __bold__ ![img](x.png)')).toBe('use the order_id and bold img');
  });
});

describe('isAdrPath', () => {
  it('accepts files directly in a docs/adr folder, not READMEs or templates', () => {
    expect(isAdrPath('docs/adr/0001-a.md')).toBe(true);
    expect(isAdrPath('src/billing/docs/adr/0001-a.md')).toBe(true);
    expect(isAdrPath('docs/adr/README.md')).toBe(false);
    expect(isAdrPath('docs/adr/0000-template.md')).toBe(false);
    expect(isAdrPath('docs/adr/old/0001-a.md')).toBe(false);
    expect(isAdrPath('docs/0001-a.md')).toBe(false);
  });
});
