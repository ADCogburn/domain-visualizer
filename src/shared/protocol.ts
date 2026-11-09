/**
 * The contract between the MCP server and the view. Both sides import this file;
 * it must stay free of Node and DOM imports.
 *
 * TOOL_NAME and the input schema are public API once released: add optional fields,
 * never rename or remove them.
 */
import type { DomainModel } from '../model/types.js';

export const TOOL_NAME = 'show_domain';
export const VIEW_URI = 'ui://domain-visualizer/domain-view.html';

/** Views the panel can open. Add an id here when adding a view under src/ui/views/. */
export const VIEWS = ['glossary'] as const;
export type ViewId = (typeof VIEWS)[number];

/**
 * Key under the tool result's `_meta` that carries the payload to the view.
 *
 * Not `structuredContent`: Claude Code shows structuredContent to the model *instead of*
 * the text content when both are present, which hid the text summary and spent context
 * on the whole model. Hosts forward `_meta` to the view; models don't see it.
 */
export const PAYLOAD_META_KEY = 'domain-visualizer/payload';

/** What the view receives in the tool result's `_meta[PAYLOAD_META_KEY]`. */
export interface ShowDomainPayload {
  [key: string]: unknown;
  view: ViewId;
  /** Where the model came from: a folder path or "inline files". */
  source: string;
  model: DomainModel;
}

export function isShowDomainPayload(x: unknown): x is ShowDomainPayload {
  const p = x as ShowDomainPayload | null;
  return !!p && typeof p === 'object' && !!p.model && Array.isArray(p.model.contexts);
}
