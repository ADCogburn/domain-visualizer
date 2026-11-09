import { countTerms, type DomainModel } from '../model/types.js';

/**
 * Plain-text rendering of the model. This is all Claude Code (and any host without
 * MCP Apps) sees, so it has to stand on its own.
 */
export function summarize(model: DomainModel, sourceLabel: string): string {
  const out: string[] = [];
  const n = countTerms(model);
  const ctx = model.contexts.length;
  out.push(`Domain glossary from ${sourceLabel}: ${n} term${n === 1 ? '' : 's'} in ${ctx} context${ctx === 1 ? '' : 's'}.`);

  for (const c of model.contexts) {
    out.push('');
    out.push(`## ${c.name}${c.source ? ` (${c.source})` : ''}`);
    const about = c.purpose || c.description;
    if (about) out.push(about);
    let cluster: string | null = null;
    for (const t of c.terms) {
      if (t.cluster !== cluster) {
        cluster = t.cluster;
        if (cluster) out.push(`### ${cluster}`);
      }
      const avoid = t.avoid.length ? ` (avoid: ${t.avoid.join(', ')})` : '';
      out.push(`- **${t.name}**: ${t.definition || '(no definition)'}${avoid}`);
    }
  }

  const rels = model.relationships;
  if (rels.length) {
    out.push('', '## Relationships');
    for (const r of rels) {
      if (r.kind === 'context') out.push(`- ${r.from} ${r.bidirectional ? '↔' : '→'} ${r.to}: ${r.description}`);
      else out.push(`- [${r.context}] ${r.description}`);
    }
  }

  if (model.warnings.length) {
    out.push('', '## Warnings');
    for (const w of model.warnings) out.push(`- ${w}`);
  }
  return out.join('\n');
}
