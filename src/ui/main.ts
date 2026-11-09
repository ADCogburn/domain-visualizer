/** Entry point inside the host (Claude). Wires the ext-apps App to the shell. */
import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { isShowDomainPayload, PAYLOAD_META_KEY } from '../shared/protocol.js';
import { createShell } from './shell.js';
import type { DisplayMode } from './views/index.js';
import './styles.css';

declare const __VERSION__: string;

const root = document.getElementById('app')!;
const app = new App({ name: 'domain-visualizer', version: __VERSION__ }, { availableDisplayModes: ['inline', 'fullscreen'] });

let mode: DisplayMode = 'inline';
let available: DisplayMode[] = [];

const shell = createShell(root, {
  displayMode: () => mode,
  availableDisplayModes: () => available,
  async requestDisplayMode(next) {
    const res = await app.requestDisplayMode({ mode: next });
    mode = res.mode;
    return mode;
  },
  openLink(url) {
    void app.openLink({ url }).catch(() => undefined);
  },
});

function applyContext(ctx: McpUiHostContext | undefined) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.availableDisplayModes) available = ctx.availableDisplayModes;
  if (ctx.displayMode && ctx.displayMode !== mode) {
    mode = ctx.displayMode;
    shell.refresh();
  }
}

// Register handlers before connecting so no notification is missed.
app.ontoolinput = () => shell.showLoading();
app.ontoolresult = (result) => {
  if (result.isError) {
    const text = result.content?.find((c) => c.type === 'text');
    shell.showError(text && 'text' in text ? text.text : 'show_domain failed.');
  } else if (isShowDomainPayload(result._meta?.[PAYLOAD_META_KEY])) {
    shell.showPayload(result._meta[PAYLOAD_META_KEY]);
  } else {
    shell.showError('No domain model in the tool result.');
  }
};
app.ontoolcancelled = () => shell.showError('Cancelled.');
app.onhostcontextchanged = (ctx) => applyContext(ctx as McpUiHostContext);

shell.showLoading();
app
  .connect()
  .then(() => applyContext(app.getHostContext()))
  .catch((e: unknown) => shell.showError(`Could not connect to the host: ${(e as Error).message}`));
