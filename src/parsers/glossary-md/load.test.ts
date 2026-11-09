import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diskSource } from '../../sources/disk.js';
import { inlineSource } from '../../sources/inline.js';
import { loadDomain } from '../index.js';

const fixtures = join(import.meta.dirname, '../../../fixtures');
const read = (p: string) => readFileSync(join(fixtures, p), 'utf8');

describe('loadDomain from disk', () => {
  it('loads a single-context project', async () => {
    const m = await loadDomain(await diskSource(join(fixtures, 'single-context')));
    expect(m.contexts.map((c) => c.name)).toEqual(['Billing']);
    expect(m.contexts[0]!.source).toBe('GLOSSARY.md');
    expect(m.contexts[0]!.terms.map((t) => t.name)).toEqual(['Invoice', 'Customer', 'Payment', 'Refund']);
    expect(m.relationships.filter((r) => r.kind === 'term')).toHaveLength(2);
    expect(m.warnings).toEqual([]);
  });

  it('loads a multi-context project through GLOSSARY-MAP.md', async () => {
    const m = await loadDomain(await diskSource(join(fixtures, 'multi-context')));
    expect(m.contexts.map((c) => [c.name, c.source, c.purpose])).toEqual([
      ['Ordering', 'src/ordering/GLOSSARY.md', 'receives and tracks customer orders'],
      ['Billing', 'src/billing/GLOSSARY.md', 'generates invoices and processes payments'],
      ['Identity', 'src/identity/GLOSSARY.md', 'logins and permissions'],
    ]);
    expect(m.relationships).toEqual([
      { kind: 'context', from: 'Ordering', to: 'Billing', bidirectional: false, description: 'Ordering emits OrderPlaced events; Billing consumes them to raise invoices' },
      { kind: 'context', from: 'Billing', to: 'Identity', bidirectional: true, description: 'Billing looks up the account that acts for each customer' },
    ]);
    expect(m.warnings).toEqual([]);
  });

  it('falls back to a legacy CONTEXT.md', async () => {
    const m = await loadDomain(await diskSource(join(fixtures, 'legacy-context')));
    const [c] = m.contexts;
    expect(c!.name).toBe('Fulfillment');
    expect(c!.terms.map((t) => [t.name, t.avoid])).toEqual([
      ['Shipment', ['delivery', 'consignment']],
      ['Pick List', ['picking slip']],
      ['Wave', []],
    ]);
    expect(c!.terms[1]!.definition).toBe('The list of products a picker collects for one shipment. It is printed at the start of each wave.');
  });

  it('loads one file when pointed at it', async () => {
    const m = await loadDomain(await diskSource(join(fixtures, 'multi-context/src/identity/GLOSSARY.md')));
    expect(m.contexts.map((c) => c.name)).toEqual(['Identity']);
  });

  it('discovers nested glossaries when there is no map', async () => {
    const m = await loadDomain(await diskSource(join(fixtures, 'multi-context/src')));
    expect(m.contexts.map((c) => c.name)).toEqual(['Billing', 'Identity', 'Ordering']);
    expect(m.warnings[0]).toMatch(/no GLOSSARY-MAP\.md/);
  });

  it('reports a folder with no glossary', async () => {
    const m = await loadDomain(await diskSource(join(fixtures, '..', 'src', 'model')));
    expect(m.contexts).toEqual([]);
    expect(m.warnings[0]).toMatch(/no GLOSSARY-MAP\.md, GLOSSARY\.md/);
  });

  it('throws for a missing path', async () => {
    await expect(diskSource(join(fixtures, 'nope'))).rejects.toThrow(/Path not found/);
  });
});

describe('loadDomain from inline files', () => {
  it('matches the disk result for a multi-context project', async () => {
    const files = ['GLOSSARY-MAP.md', 'src/ordering/GLOSSARY.md', 'src/billing/GLOSSARY.md', 'src/identity/GLOSSARY.md'].map((p) => ({
      path: p,
      content: read(join('multi-context', p)),
    }));
    const inline = await loadDomain(inlineSource(files));
    const disk = await loadDomain(await diskSource(join(fixtures, 'multi-context')));
    expect(inline).toEqual(disk);
  });

  it('treats a single file as the glossary whatever its name', async () => {
    const m = await loadDomain(inlineSource([{ path: 'notes.md', content: read('single-context/GLOSSARY.md') }]));
    expect(m.contexts[0]!.name).toBe('Billing');
  });

  it('accepts CONTEXT-MAP.md with ./ and Windows-style paths', async () => {
    const m = await loadDomain(
      inlineSource([
        { path: 'CONTEXT-MAP.md', content: '## Contexts\n\n- [Ship](./ship/CONTEXT.md): ships\n- [Gone](../outside.md): escapes\n' },
        { path: 'ship\\CONTEXT.md', content: read('legacy-context/CONTEXT.md') },
      ]),
    );
    expect(m.contexts.map((c) => [c.name, c.terms.length])).toEqual([
      ['Ship', 3],
      ['Gone', 0],
    ]);
    expect(m.warnings).toEqual(['CONTEXT-MAP.md: "Gone" links to ../outside.md, which could not be read']);
  });

  it('warns about relationships to unknown contexts', async () => {
    const m = await loadDomain(
      inlineSource([
        { path: 'GLOSSARY-MAP.md', content: '## Contexts\n\n- [A](a/GLOSSARY.md): a\n\n## Relationships\n\n- **A → B**: uses\n' },
        { path: 'a/GLOSSARY.md', content: '# A\n\n## Language\n\n**X**:\nAn x.\n' },
      ]),
    );
    expect(m.warnings).toEqual(['GLOSSARY-MAP.md: relationship mentions unknown context "B"']);
  });
});
