import { countTerms, emptyModel, type DomainModel } from '../model/types.js';
import type { ShowDomainPayload } from '../shared/protocol.js';
import { views, type DisplayMode, type NavigateOptions, type Route, type ViewContext } from './views/index.js';

/** The shell's view of the host. Implemented by main.ts (real host) and dev.ts (browser). */
export interface HostAdapter {
  displayMode(): DisplayMode;
  availableDisplayModes(): DisplayMode[];
  /** Resolves with the mode the host actually switched to. */
  requestDisplayMode(mode: DisplayMode): Promise<DisplayMode>;
  /** Open an external URL (the host may ask the user first). */
  openLink(url: string): void;
}

export interface Shell {
  showLoading(): void;
  showPayload(payload: ShowDomainPayload): void;
  showError(message: string): void;
  /** Re-render after the host changes display mode. */
  refresh(): void;
}

/**
 * Header, page navigation and display-mode plumbing around whichever view is active.
 * Pages change inside the panel (no new tool call): Home -> Glossary or an ADR, and back.
 */
export function createShell(root: HTMLElement, host: HostAdapter): Shell {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  let payload: ShowDomainPayload | null = null;
  let model: DomainModel = emptyModel();
  let route: Route = { view: 'home' };
  /** Scroll position per page, so "← Home" lands where you left it. */
  const scrolls = new Map<string, number>();
  let cleanup: void | (() => void);

  const render = () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = undefined;
    root.replaceChildren();
    if (!payload) return;
    const mode = host.displayMode();
    doc.documentElement.dataset.displayMode = mode;
    doc.documentElement.dataset.page = route.view;
    const view = views[route.view] ?? views.home;
    const canFullscreen = host.availableDisplayModes().includes('fullscreen');

    const header = doc.createElement('header');
    header.className = 'dv-header';
    if (route.view === 'home') {
      header.append(title(model.project, payload.source));
    } else {
      const back = button('← Home', 'dv-back');
      back.addEventListener('click', () => navigate({ view: 'home' }));
      header.append(back);
      if (route.view === 'glossary') {
        header.append(title('Glossary'));
        const meta = doc.createElement('span');
        meta.className = 'dv-meta';
        const n = countTerms(model);
        const c = model.contexts.length;
        meta.textContent = `${c} context${c === 1 ? '' : 's'} · ${n} term${n === 1 ? '' : 's'}`;
        meta.title = payload.source;
        header.append(meta);
      }
    }
    const spacer = doc.createElement('span');
    spacer.className = 'dv-spacer';
    header.append(spacer);
    if (canFullscreen) {
      const btn = button(mode === 'fullscreen' ? 'Exit full screen' : 'Full screen');
      btn.addEventListener('click', () => void setMode(mode === 'fullscreen' ? 'inline' : 'fullscreen'));
      header.append(btn);
    }

    const body = doc.createElement('div');
    body.className = 'dv-body';
    root.append(header, body);

    const ctx: ViewContext = {
      displayMode: mode,
      canFullscreen,
      requestDisplayMode: setMode,
      route,
      navigate,
      openLink: (url) => host.openLink(url),
    };
    cleanup = view.render(body, model, ctx);

    if (model.warnings.length && route.view !== 'adr') {
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

  const title = (text: string, hint?: string) => {
    const h = doc.createElement('h1');
    h.className = 'dv-title';
    h.textContent = text;
    if (hint) h.title = hint;
    return h;
  };
  const button = (text: string, extra = '') => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = `dv-button ${extra}`.trim();
    b.textContent = text;
    return b;
  };

  const setMode = async (mode: DisplayMode) => {
    await host.requestDisplayMode(mode).catch(() => undefined);
    render();
  };

  const navigate = async (next: Route, opts: NavigateOptions = {}) => {
    scrolls.set(routeKey(route), win?.scrollY ?? 0);
    route = next;
    if (opts.fullscreen && host.displayMode() !== 'fullscreen' && host.availableDisplayModes().includes('fullscreen')) {
      await host.requestDisplayMode('fullscreen').catch(() => undefined);
    }
    render();
    win?.scrollTo?.(0, next.view === 'home' ? (scrolls.get(routeKey(next)) ?? 0) : 0);
    root.querySelector<HTMLElement>('.dv-back, .dv-title')?.focus?.({ preventScroll: true });
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
      // Tolerate payloads from an older server without project / adrs.
      model = { ...emptyModel(), ...p.model, adrs: p.model.adrs ?? [], project: p.model.project || 'Domain' };
      route = p.view === 'glossary' ? { view: 'glossary' } : { view: 'home' };
      scrolls.clear();
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

const routeKey = (r: Route) => (r.view === 'adr' ? `adr:${r.adr}` : r.view);
