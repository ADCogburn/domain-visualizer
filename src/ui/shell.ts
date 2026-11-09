import { countTerms } from '../model/types.js';
import type { ShowDomainPayload } from '../shared/protocol.js';
import { views, type DisplayMode, type ViewContext } from './views/index.js';

/** The shell's view of the host. Implemented by main.ts (real host) and dev.ts (browser). */
export interface HostAdapter {
  displayMode(): DisplayMode;
  availableDisplayModes(): DisplayMode[];
  /** Resolves with the mode the host actually switched to. */
  requestDisplayMode(mode: DisplayMode): Promise<DisplayMode>;
}

export interface Shell {
  showLoading(): void;
  showPayload(payload: ShowDomainPayload): void;
  showError(message: string): void;
  /** Re-render after the host changes display mode. */
  refresh(): void;
}

/** Header, view switching and display-mode plumbing around whichever view is active. */
export function createShell(root: HTMLElement, host: HostAdapter): Shell {
  const doc = root.ownerDocument;
  let payload: ShowDomainPayload | null = null;
  let cleanup: void | (() => void);

  const render = () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = undefined;
    root.replaceChildren();
    if (!payload) return;
    const mode = host.displayMode();
    doc.documentElement.dataset.displayMode = mode;
    const view = views[payload.view] ?? views.glossary;
    const { model } = payload;
    const canFullscreen = host.availableDisplayModes().includes('fullscreen');

    const header = doc.createElement('header');
    header.className = 'dv-header';
    const title = doc.createElement('h1');
    title.className = 'dv-title';
    title.textContent = `Domain ${view.title.toLowerCase()}`;
    const meta = doc.createElement('span');
    meta.className = 'dv-meta';
    const n = countTerms(model);
    const c = model.contexts.length;
    meta.textContent = `${c} context${c === 1 ? '' : 's'} · ${n} term${n === 1 ? '' : 's'}`;
    meta.title = payload.source;
    header.append(title, meta);
    if (canFullscreen) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'dv-button';
      btn.textContent = mode === 'fullscreen' ? 'Exit full screen' : 'Full screen';
      btn.addEventListener('click', () => void setMode(mode === 'fullscreen' ? 'inline' : 'fullscreen'));
      header.append(btn);
    }

    const body = doc.createElement('div');
    body.className = 'dv-body';
    root.append(header, body);

    const ctx: ViewContext = { displayMode: mode, canFullscreen, requestDisplayMode: setMode };
    cleanup = view.render(body, model, ctx);

    if (model.warnings.length) {
      const details = doc.createElement('details');
      details.className = 'dv-warnings';
      const summary = doc.createElement('summary');
      summary.textContent = `${model.warnings.length} warning${model.warnings.length === 1 ? '' : 's'}`;
      const ul = doc.createElement('ul');
      for (const w of model.warnings) {
        const li = doc.createElement('li');
        li.textContent = w;
        ul.append(li);
      }
      details.append(summary, ul);
      root.append(details);
    }
  };

  const setMode = async (mode: DisplayMode) => {
    await host.requestDisplayMode(mode).catch(() => undefined);
    render();
  };

  return {
    showLoading() {
      payload = null;
      const box = doc.createElement('div');
      box.className = 'dv-loading';
      box.setAttribute('aria-busy', 'true');
      for (const w of [40, 90, 75, 85]) {
        const bar = doc.createElement('div');
        bar.className = 'dv-skeleton';
        bar.style.width = `${w}%`;
        box.append(bar);
      }
      root.replaceChildren(box);
    },
    showPayload(p) {
      payload = p;
      render();
    },
    showError(message) {
      payload = null;
      const p = doc.createElement('p');
      p.className = 'dv-error';
      p.textContent = message;
      root.replaceChildren(p);
    },
    refresh: render,
  };
}
