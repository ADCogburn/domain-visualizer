import type { Adr } from '../../model/types.js';
import { basename } from '../../sources/paths.js';

export type ParsedAdr = Omit<Adr, 'path' | 'context'>;

/**
 * Read one ADR file: optional `status:` frontmatter, an H1 title, then free Markdown.
 * The template (domain-modeling ADR-FORMAT.md) opens with a 1-3 sentence paragraph of
 * context, decision and reason, which becomes the summary.
 */
export function parseAdr(path: string, text: string): ParsedAdr {
  let src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  let status: string | null = null;
  const fm = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
  if (fm) {
    const m = /^status:[ \t]*(.+?)[ \t]*$/im.exec(fm[1]!);
    if (m) status = unquote(m[1]!) || null;
    src = src.slice(fm[0].length);
  }

  const name = basename(path).replace(/\.md$/i, '');
  const num = /^(\d+)[-_ .]/.exec(name) ?? /^(\d+)$/.exec(name);
  const number = num ? Number(num[1]) : null;

  let title = '';
  const lines = src.split('\n');
  const h1 = firstH1(lines);
  if (h1 >= 0) {
    title = plain(lines[h1]!.replace(/^#\s+/, '').replace(/\s+#+\s*$/, ''))
      // "# 7. Use Postgres" / "# ADR-0007: Use Postgres" repeat the number we already have.
      .replace(/^(?:ADR[-\s]?)?\d+\s*[.:)\-–—]\s*/i, '');
    lines.splice(h1, 1);
  }
  if (!title) title = words(name.replace(/^\d+[-_ .]*/, '')) || name;

  const body = lines.join('\n').replace(/^\s*\n/, '').trimEnd();
  return { number, title, status, summary: firstParagraph(body), body };
}

/** Index of the first `# ` line outside code fences, or -1. Only blank lines and HTML comments may precede it. */
function firstH1(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (!l || /^<!--.*-->$/.test(l)) continue;
    return /^#\s+\S/.test(l) ? i : -1;
  }
  return -1;
}

/** The first prose paragraph: not a heading, list, quote, table, fence, HTML or a bare "Status: x" line. */
function firstParagraph(body: string): string {
  let fenced = false;
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    const fences = (t.match(/^(```|~~~)/gm) ?? []).length;
    if (fenced || /^(```|~~~)/.test(t)) {
      if (fences % 2 === 1) fenced = !fenced;
      continue;
    }
    if (!t || /^(#|[-*+]\s|\d+[.)]\s|>|\||<|!\[)/.test(t) || /^status\s*:/i.test(t)) continue;
    return plain(t);
  }
  return '';
}

/** Markdown inline syntax stripped and whitespace collapsed. */
export function plain(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])[*_]([^*_\s][^*_]*?)[*_](?=[^\w*]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

const words = (s: string) => {
  const w = s.replace(/[-_]+/g, ' ').trim();
  return w ? w[0]!.toUpperCase() + w.slice(1) : '';
};

const unquote = (s: string) => s.replace(/^(['"])(.*)\1$/, '$2').trim();
