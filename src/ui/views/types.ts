import type { DomainModel } from '../../model/types.js';
import type { ViewId } from '../../shared/protocol.js';

export type DisplayMode = 'inline' | 'fullscreen' | 'pip';

/** Which page the panel shows. The ADR page also needs which ADR (its path). */
export type Route = { view: 'home' } | { view: 'glossary' } | { view: 'adr'; adr: string };

export interface NavigateOptions {
  /** Ask the host for full screen first, when it has one. */
  fullscreen?: boolean;
}

/** What the shell tells a view about where it is drawn. Views never talk to the host directly. */
export interface ViewContext {
  displayMode: DisplayMode;
  /** True when the host can switch this panel to full screen. */
  canFullscreen: boolean;
  requestDisplayMode(mode: DisplayMode): Promise<void>;
  /** The page being drawn. */
  route: Route;
  /** Move to another page inside the panel (no new tool call). */
  navigate(route: Route, opts?: NavigateOptions): void;
  /** Open an external URL through the host. */
  openLink(url: string): void;
}

/**
 * One way of looking at the domain model. Views depend only on model/ and the DOM:
 * never on parsers/, sources/ or server/. Add one by creating src/ui/views/<id>/,
 * registering it in ./index.ts, and adding its id to VIEWS in src/shared/protocol.ts.
 */
export interface DomainView {
  id: ViewId;
  title: string;
  /** Draw into `root` (already emptied). May return a cleanup function. */
  render(root: HTMLElement, model: DomainModel, ctx: ViewContext): void | (() => void);
}
