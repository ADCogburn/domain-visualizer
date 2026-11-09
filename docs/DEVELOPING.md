# Developing domain-visualizer

Requires Node 22 or later for development (the built server runs on Node 20+) and the `claude` CLI on your PATH for `npm run validate`.

```bash
npm install
npm test
npm run build
npm run validate
```

`npm run build` writes `dist/ui/mcp-app.html` (the view, one self-contained file), then bundles the server with that HTML inlined into `plugins/domain-visualizer/server/server.js`. Commit `server.js` whenever anything under `src/` changes: plugins are installed by copying the folder, with no build step.

Pick the fastest loop that covers your change. They go from quickest (UI only) to closest to real use.

## 1. Browser only: `dev:ui`

For layout, styling, theming and interaction work on a view.

```bash
npm run dev:ui
```

Vite opens `http://localhost:5173/dev.html`, which renders the real shell and views with the fixtures in `fixtures/` and a fake host. The toolbar switches fixture, theme (system, light, dark), display mode (inline or full screen), width (720px desktop or 360px mobile), and whether the host offers full screen. Edits hot-reload.

No host CSS variables are injected here, so you see the fallbacks in `src/ui/styles.css`. They copy Claude's documented token values, but check the real host before calling a design done.

## 2. MCP inspector

For the tool contract: input schema, text summary, the `_meta["domain-visualizer/payload"]` model, and the view running in a real MCP Apps host bridge.

```bash
npm run build
npm run inspect
```

This starts MCPJam Inspector (pinned to 3.19.0) against the built `server.js`, with `CLAUDE_PROJECT_DIR` set to `fixtures/`. In the inspector, call `show_domain` with any of:

```json
{ "path": "multi-context" }
{ "path": "single-context" }
{ "path": "legacy-context" }
{ "files": [{ "path": "GLOSSARY.md", "content": "# Shop\n\n## Language\n\n**Cart**:\nItems a shopper intends to buy.\n_Avoid_: basket\n" }] }
```

Pass inspector flags after `--`, e.g. `npm run inspect -- --port 4000`.

The ext-apps repo also ships a minimal reference host. To use it instead, clone https://github.com/modelcontextprotocol/ext-apps, follow `examples/basic-host/README.md`, and point it at `node <repo>/plugins/domain-visualizer/server/server.js`.

`npm test` also runs `scripts/built-server.test.ts`, which spawns the built server over stdio and calls `show_domain` on every fixture, so a broken bundle fails the tests.

## 3. Claude Code

For the skill, the MCP server wiring, and the text result. **The panel doesn't render in Claude Code**; you only see the tool's text.

```bash
npm run build
claude --plugin-dir ./plugins/domain-visualizer
```

In the session:

- `/mcp` should list `plugin:domain-visualizer:domain-visualizer` as connected, with the `show_domain` tool.
- `/skills` (or typing `/domain`) should list `domain-visualizer:domain-visualizer`.
- Ask "show me the domain glossary for fixtures/multi-context". Claude should call `show_domain` and show the text summary.
- After rebuilding, run `/reload-plugins` to pick up changes without restarting.

## 4. Claude Desktop (chat)

For the panel in a real Claude host. Claude Desktop chat doesn't load local servers from plugins, so register the built server in Desktop's own config.

1. Run `npm run build`.
2. Open **Settings > Developer > Edit Config**. That opens `claude_desktop_config.json`: `%APPDATA%\Claude\claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS.
3. Add this entry inside `"mcpServers"`, replacing `<repo>` with the absolute path to this checkout (on Windows, use `\\` between path segments):

   ```json
   {
     "mcpServers": {
       "domain-visualizer": {
         "command": "node",
         "args": ["<repo>/plugins/domain-visualizer/server/server.js"],
         "env": { "CLAUDE_PROJECT_DIR": "<repo>/fixtures" }
       }
     }
   }
   ```

   `CLAUDE_PROJECT_DIR` is the folder that relative `path` arguments resolve against. Point it at your own project to see your own glossary.

4. Fully quit Claude Desktop (from the tray or menu bar, not only by closing the window) and start it again.
5. In a new chat, ask "Use show_domain with path multi-context". Allow the app when asked. An inline card should show the glossary with a **Full screen** button.

**Desktop caches the UI aggressively.** After any UI change, run `npm run build` and fully quit and restart Desktop. Reloading the chat isn't enough.

## 5. Cowork

For the plugin as users will install it. The local server runs only in Cowork sessions on your computer.

Either upload a zip:

```powershell
npm run build
Compress-Archive -Path plugins/domain-visualizer -DestinationPath domain-visualizer.zip -Force
```

```bash
# macOS / Linux
npm run build && (cd plugins && zip -r ../domain-visualizer.zip domain-visualizer)
```

then in Claude Desktop go to **Customize > Plugins > Add > Upload plugin** and choose `domain-visualizer.zip`.

Or, after pushing to GitHub, go to **Customize > Plugins > Add > Add marketplace**, enter `<owner>/domain-visualizer`, and add **Domain Visualizer** from it. For a private repository, connect GitHub and install the Claude GitHub App on the repo when the dialog asks.

Start a new Cowork task on your computer, in a folder that has a `GLOSSARY.md`, and ask Claude to show the domain glossary. Check that the plugin's **Connectors** tab shows the server as **Runs in each session**.

An uploaded zip doesn't update itself: upload it again after each rebuild.

## Release checklist

1. `npm test && npm run typecheck && npm run build && npm run validate`
2. Bump `version` in `plugins/domain-visualizer/.claude-plugin/plugin.json` (the build stamps it into `server.js`), rebuild, and commit `server.js`.
3. Smoke test loops 3 and 4.
