# domain-visualizer

A Claude plugin that shows a project's domain (DDD ubiquitous language, bounded contexts, relationships) as an interactive MCP App panel, inferred from the project's own glossary files. The plugin name `domain-visualizer`, the tool name `show_domain` and its input schema are public API: add optional fields, never rename or remove.

## Layout

```
.claude-plugin/marketplace.json   lets people add this repo as a marketplace
plugins/domain-visualizer/        exactly what Claude installs (copied as-is, no build step)
  .claude-plugin/plugin.json      manifest only; nothing else goes in .claude-plugin/
  .mcp.json                       starts node ${CLAUDE_PLUGIN_ROOT}/server/server.js
  server/server.js                GENERATED bundle (npm run build), committed
  server/package.json             pins server.js to CommonJS in and out of this repo
  skills/domain-visualizer/       when Claude should call show_domain
src/
  model/        DomainModel types + term index. Imports nothing else in src/.
  sources/      FileSource: disk (local server) or inline tool-argument files (remote-safe)
  parsers/      input formats -> DomainModel. glossary-md/ = GLOSSARY(-MAP).md, CONTEXT(-MAP).md
  shared/       protocol.ts: tool name, view URI, view ids, payload type (server <-> view contract)
  server/       MCP server, show_domain tool, text summary, stdio entry (main.ts)
  ui/           MCP App: main.ts (host wiring), shell.ts (header, display modes), dev.ts (browser harness)
    views/      one folder per view (glossary/ now; mermaid/, graph/ later)
  test-support/ shared test data
fixtures/       sample projects: single-context, multi-context, legacy-context
scripts/        build-server.mjs, inspect.mjs, built-server.test.ts (stdio end-to-end)
```

## Layering rule

Parsing, the domain model, and views are separate layers, so a new input format or a new view never touches the others.

- `model/` depends on nothing. It must stay JSON-serializable: it travels to the view in the tool result's `_meta["domain-visualizer/payload"]`.
- `parsers/` depends on `model/` and the `FileSource` interface only. New format: add `src/parsers/<format>/`, implement `DomainParser`, register it in `src/parsers/index.ts`.
- `ui/views/` depend on `model/` and the DOM only; never on parsers, sources or server. New view: add `src/ui/views/<id>/`, register it in `src/ui/views/index.ts`, add the id to `VIEWS` in `src/shared/protocol.ts`.
- `server/` composes sources + parsers + summary. `shared/` has no Node or DOM imports.
- Only `sources/disk.ts` and `server/` may import `node:*`.

## Commands

```bash
npm test            # vitest: unit, DOM (jsdom) and the built-server stdio test
npm run typecheck   # tsc --noEmit
npm run dev:ui      # browser-only view with fixture data (src/ui/dev.html)
npm run build       # vite single-file view -> dist/ui, then esbuild -> plugins/domain-visualizer/server/server.js
npm run validate    # claude plugin validate plugins/domain-visualizer
npm run inspect     # MCPJam Inspector against the built server
```

Always run `npm run build` and commit `server/server.js` with any change under `src/`; the built-server test runs against that file. Full test loops: `docs/DEVELOPING.md`.

## Platform facts (checked 2026-11-09)

- Plugin layout: only `plugin.json` inside `.claude-plugin/`; `skills/`, `hooks/`, `.mcp.json`, `README.md`, `LICENSE` at the plugin root. Never add a top-level `bin/`: claude.ai and Cowork refuse to install a plugin that has one. A `CLAUDE.md` in the plugin folder isn't loaded and draws a validate warning.
- Surfaces: skills load in chat, Cowork and Claude Code. Hooks and agents: Cowork and Claude Code. A local (command-started) MCP server: Claude Code, and Cowork sessions on the user's computer; chat ignores it.
- MCP App UIs render in claude.ai chat (web, desktop, mobile). Claude Code gets only the text result, so every tool returns a useful text summary.
- Never put view data in `structuredContent`: when it's present, Claude Code shows the model that JSON *instead of* the text `content` (verified with Claude Code 2.1.312). Send view data in the result's `_meta` under a `domain-visualizer/...` key; hosts forward `_meta` to the view. Because chat ignores local plugin servers, the panel reaches chat only through Claude Desktop's own `claude_desktop_config.json` or a future remote server; `show_domain` accepts `files` (raw Markdown) so it can run remotely without touching disk.
- No install step: plugins are copied as-is, so the server is one bundled file launched via `${CLAUDE_PLUGIN_ROOT}`. Node must be on the user's PATH.
- MCP Apps SDK: `@modelcontextprotocol/ext-apps` 2.x with the split MCP SDK v2 (`@modelcontextprotocol/server`), not `@modelcontextprotocol/sdk` 1.x. Server: `registerAppTool` / `registerAppResource`. View: `App`, `applyDocumentTheme`, `applyHostStyleVariables`, `applyHostFonts`. The view is one HTML file (Vite + `vite-plugin-singlefile`).
- Display: inline cards auto-fit height, can't scroll internally, and clip menus and popovers; keep inline content short. Full screen (`app.requestDisplayMode`) is for the whole view, but Claude's guidelines say no floating panels there either: use sidebars, tabs or in-flow strips. Definitions therefore live in an in-flow strip (top of the inline card, sticky sidebar in full screen).
- Theme: use the host's CSS variables (`--color-*`, `--font-*`, `--border-*`), keep the page background transparent, support light and dark. `src/ui/styles.css` holds fallbacks only.
- Claude Desktop caches MCP App UI aggressively: fully quit and restart it after UI changes.
- MCP Apps skills for coding agents: `/plugin marketplace add modelcontextprotocol/ext-apps` then `/plugin install mcp-apps@mcp-apps`.
