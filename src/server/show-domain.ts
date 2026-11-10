import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import { loadDomain } from '../parsers/index.js';
import { DEFAULT_VIEW, OPEN_VIEWS, PAYLOAD_META_KEY, type ShowDomainPayload } from '../shared/protocol.js';
import { diskSource } from '../sources/disk.js';
import { inlineSource } from '../sources/inline.js';
import type { FileSource } from '../sources/types.js';
import { summarize } from './summary.js';

export { TOOL_NAME, VIEW_URI } from '../shared/protocol.js';

export const showDomainInput = z.object({
  path: z
    .string()
    .optional()
    .describe(
      'Project folder to read (or one GLOSSARY.md / GLOSSARY-MAP.md / CONTEXT.md file). Relative paths resolve against the project root. Local server only. Pass exactly one of `path` or `files`.',
    ),
  files: z
    .array(
      z.object({
        path: z.string().describe('Repo-relative path, e.g. "GLOSSARY-MAP.md" or "src/billing/GLOSSARY.md". Map links resolve against these paths.'),
        content: z.string().describe('The file\'s raw Markdown.'),
      }),
    )
    .optional()
    .describe(
      'Raw Markdown files, for when the server cannot read the project: glossary files and ADRs (e.g. "docs/adr/0001-slug.md", or a context\'s "src/billing/docs/adr/…"). Pass exactly one of `path` or `files`.',
    ),
  view: z.enum(OPEN_VIEWS).optional().describe('Which view to open: "home" (project name and its artifacts) or "glossary". Defaults to "home"; usually leave it out so the user picks from Home.'),
  project: z.string().optional().describe('Project name shown at the top. Defaults to package.json `name`, then the folder name.'),
});

export type ShowDomainArgs = z.infer<typeof showDomainInput>;

export interface ShowDomainResult {
  [key: string]: unknown;
  /** The text summary: all a model, or a host without MCP Apps, sees. */
  content: { type: 'text'; text: string }[];
  /** The model for the view. See PAYLOAD_META_KEY for why this isn't structuredContent. */
  _meta?: { [PAYLOAD_META_KEY]: ShowDomainPayload };
  isError?: boolean;
}

export interface ShowDomainDeps {
  /** Folder relative `path`s resolve against. */
  projectRoot: string;
  /** false on a remote server: only `files` is accepted. */
  allowDisk: boolean;
}

export async function showDomain(args: ShowDomainArgs, deps: ShowDomainDeps): Promise<ShowDomainResult> {
  const hasPath = typeof args.path === 'string' && args.path.trim() !== '';
  const hasFiles = Array.isArray(args.files) && args.files.length > 0;
  if (hasPath === hasFiles) {
    return error('Pass exactly one of `path` (a project folder or glossary file) or `files` (raw Markdown).');
  }

  let source: FileSource;
  if (hasPath) {
    if (!deps.allowDisk) return error('This server cannot read local files; pass the glossary Markdown as `files` instead.');
    const p = args.path!.trim();
    try {
      source = await diskSource(isAbsolute(p) ? p : resolve(deps.projectRoot, p));
    } catch (e) {
      return error((e as Error).message);
    }
  } else {
    source = inlineSource(args.files!);
  }

  const model = await loadDomain(source, { project: args.project });
  const payload: ShowDomainPayload = { view: args.view ?? DEFAULT_VIEW, source: source.label, model };
  return { content: [{ type: 'text', text: summarize(model, source.label, payload.view) }], _meta: { [PAYLOAD_META_KEY]: payload } };
}

function error(text: string): ShowDomainResult {
  return { content: [{ type: 'text', text }], isError: true };
}
