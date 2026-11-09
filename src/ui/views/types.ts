import type { DomainModel } from '../../model/types.js';
import type { ViewId } from '../../shared/protocol.js';

export type DisplayMode = 'inline' | 'fullscreen' | 'pip';

/** What the shell tells a view about where it is drawn. Views never talk to the host directly. */
export interface ViewContext {
  displayMode: DisplayMode;
  /** True when the host can switch this panel to full screen. */
  canFullscreen: boolean;
  requestDisplayMode(mode: DisplayMode): Promise<void>;
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
