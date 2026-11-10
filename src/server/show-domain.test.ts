import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYLOAD_META_KEY } from '../shared/protocol.js';
import { showDomain, type ShowDomainResult } from './show-domain.js';

const repo = join(import.meta.dirname, '../..');
const deps = { projectRoot: repo, allowDisk: true };
const payload = (r: ShowDomainResult) => r._meta![PAYLOAD_META_KEY];

describe('showDomain', () => {
  it('reads a project path relative to the project root', async () => {
    const r = await showDomain({ path: 'fixtures/multi-context' }, deps);
    expect(r.isError).toBeUndefined();
    expect(payload(r).view).toBe('home');
    expect(payload(r).model.contexts).toHaveLength(3);
    const text = r.content[0]!.text;
    expect(text).toMatch(/^Project: multi-context\nDomain glossary from .*multi-context: 7 terms in 3 contexts\./);
    expect(text).toContain('- **Invoice**: A request for payment sent to a customer after delivery. (avoid: Bill, payment request)');
    expect(text).toContain('- Ordering → Billing: Ordering emits OrderPlaced events; Billing consumes them to raise invoices');
  });

  it('reads raw files', async () => {
    const r = await showDomain({ files: [{ path: 'GLOSSARY.md', content: '# Shop\n\n## Language\n\n**Cart**:\nItems a shopper intends to buy.\n' }] }, deps);
    expect(r.content[0]!.text).toBe('Project: Domain\nDomain glossary from inline files: 1 term in 1 context.\n\n## Shop (GLOSSARY.md)\n- **Cart**: Items a shopper intends to buy.\n\nAsk about any of these, or carry on with something else.');
  });

  it('ends the Home text with a line inviting the user to pick an Artifact or move on', async () => {
    const files = [{ path: 'GLOSSARY.md', content: '# Shop\n\n## Language\n\n**Cart**:\nItems a shopper intends to buy.\n' }];
    const home = (await showDomain({ files }, deps)).content[0]!.text;
    expect(home.endsWith('\n\nAsk about any of these, or carry on with something else.')).toBe(true);
    const glossary = (await showDomain({ files, view: 'glossary' }, deps)).content[0]!.text;
    expect(glossary).not.toContain('carry on with something else');
  });

  it('lists clusters and warnings in the text summary', async () => {
    const r = await showDomain({ files: [{ path: 'GLOSSARY.md', content: '# S\n\n## Language\n\n### Group\n\n**A**:\n' }] }, deps);
    expect(r.content[0]!.text).toContain('### Group\n- **A**: (no definition)');
    expect(r.content[0]!.text).toContain('## Warnings\n- GLOSSARY.md: line 7: "A" has no definition');
  });

  it('lists ADRs in the text summary and payload', async () => {
    const r = await showDomain({ path: 'fixtures/single-context', view: 'glossary' }, deps);
    expect(payload(r).view).toBe('glossary');
    expect(payload(r).model.adrs.map((a) => a.number)).toEqual([1, 2]);
    expect(r.content[0]!.text).toContain(
      '## ADRs (2)\n- 0001 Invoices are immutable once sent [accepted] (docs/adr/0001-invoices-are-immutable.md)\n' +
        '- 0002 Payments settle the oldest Invoice first [proposed] (docs/adr/0002-payments-settle-oldest-invoice-first.md)',
    );
  });

  it('shows a project that has ADRs but no glossary', async () => {
    const r = await showDomain({ files: [{ path: 'docs/adr/0003-use-postgres.md', content: '# Use Postgres\n\nWe need SQL.\n' }], project: '  Shop  ' }, deps);
    expect(r.isError).toBeUndefined();
    const m = payload(r).model;
    expect(m.project).toBe('Shop');
    expect(m.contexts).toEqual([]);
    expect(m.warnings).toEqual([]);
    expect(m.adrs).toEqual([
      { path: 'docs/adr/0003-use-postgres.md', number: 3, title: 'Use Postgres', status: null, context: null, summary: 'We need SQL.', body: 'We need SQL.' },
    ]);
    expect(r.content[0]!.text).toBe('Project: Shop\nNo glossary found in inline files.\n\n## ADRs (1)\n- 0003 Use Postgres (docs/adr/0003-use-postgres.md)\n\nAsk about any of these, or carry on with something else.');
  });

  it('requires exactly one of path or files', async () => {
    expect((await showDomain({}, deps)).isError).toBe(true);
    expect((await showDomain({ path: '.', files: [{ path: 'a.md', content: '' }] }, deps)).isError).toBe(true);
  });

  it('refuses paths when disk access is off (remote server)', async () => {
    const r = await showDomain({ path: '.' }, { ...deps, allowDisk: false });
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toMatch(/pass the glossary Markdown as `files`/);
  });

  it('reports a missing path as an error', async () => {
    const r = await showDomain({ path: 'fixtures/nope' }, deps);
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toMatch(/Path not found/);
  });
});
