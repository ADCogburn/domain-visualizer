import { Marked, type Tokens } from 'marked';

/**
 * ADR Markdown -> HTML (GitHub-flavoured: tables, task lists, autolinks).
 *
 * The output goes into innerHTML, so nothing from the file passes through raw:
 *  - raw HTML is shown as text (HTML comments are dropped);
 *  - images become their alt text (no network requests from the view);
 *  - links keep only http(s) / mailto / relative targets. External ones get
 *    `data-external`, relative ones `data-href` with the raw target, for the view
 *    to handle; neither navigates the iframe itself.
 */
const md = new Marked({
  gfm: true,
  async: false,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return /^\s*<!--[\s\S]*-->\s*$/.test(text) ? '' : escapeHtml(text);
    },
    image({ text }: Tokens.Image) {
      return text ? `<span class="adr-img-alt">${escapeHtml(text)}</span>` : '';
    },
    link(this: { parser: { parseInline(t: Tokens.Link['tokens']): string } }, { href, title, tokens }: Tokens.Link) {
      const inner = this.parser.parseInline(tokens);
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      if (/^(https?:|mailto:)/i.test(href)) return `<a href="${escapeHtml(href)}" data-external${t}>${inner}</a>`;
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return inner; // javascript:, data:, protocol-relative…
      return `<a href="#" data-href="${escapeHtml(href)}"${t}>${inner}</a>`;
    },
  },
});

export function renderMarkdown(source: string): string {
  return md.parse(source, { async: false }) as string;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
