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
    expect(payload(r).view).toBe('glossary');
    expect(payload(r).model.contexts).toHaveLength(3);
    const text = r.content[0]!.text;
    expect(text).toMatch(/^Domain glossary from .*multi-context: 7 terms in 3 contexts\./);
    expect(text).toContain('- **Invoice**: A request for payment sent to a customer after delivery. (avoid: Bill, payment request)');
    expect(text).toContain('- Ordering → Billing: Ordering emits OrderPlaced events; Billing consumes them to raise invoices');
  });

  it('reads raw files', async () => {
    const r = await showDomain({ files: [{ path: 'GLOSSARY.md', content: '# Shop\n\n## Language\n\n**Cart**:\nItems a shopper intends to buy.\n' }] }, deps);
    expect(r.content[0]!.text).toBe('Domain glossary from inline files: 1 term in 1 context.\n\n## Shop (GLOSSARY.md)\n- **Cart**: Items a shopper intends to buy.');
  });

  it('lists clusters and warnings in the text summary', async () => {
    const r = await showDomain({ files: [{ path: 'GLOSSARY.md', content: '# S\n\n## Language\n\n### Group\n\n**A**:\n' }] }, deps);
    expect(r.content[0]!.text).toContain('### Group\n- **A**: (no definition)');
    expect(r.content[0]!.text).toContain('## Warnings\n- GLOSSARY.md: line 7: "A" has no definition');
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
