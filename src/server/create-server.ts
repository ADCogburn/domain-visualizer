import { RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/server';
import { showDomain, showDomainInput, TOOL_NAME, VIEW_URI, type ShowDomainDeps } from './show-domain.js';

export interface ServerOptions extends ShowDomainDeps {
  version: string;
  /** The single-file view HTML (embedded at build time). */
  viewHtml: string;
}

export function createServer(opts: ServerOptions): McpServer {
  const server = new McpServer({ name: 'domain-visualizer', version: opts.version });

  registerAppTool(
    server,
    TOOL_NAME,
    {
      title: 'Show domain',
      description:
        "Show the project's domain language (DDD bounded contexts, glossary terms, definitions, avoided synonyms and relationships) " +
        'read from GLOSSARY.md / GLOSSARY-MAP.md (or legacy CONTEXT.md / CONTEXT-MAP.md). Renders an interactive glossary panel where supported ' +
        'and always returns a text summary.',
      inputSchema: showDomainInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: VIEW_URI } },
    },
    async (args) => showDomain(args, opts),
  );

  registerAppResource(server, 'Domain view', VIEW_URI, { description: 'Interactive glossary of the domain model' }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: opts.viewHtml }],
  }));

  return server;
}
