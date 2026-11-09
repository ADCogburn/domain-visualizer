/** Gap between the term and the tooltip, and the minimum distance from the viewport edge. */
const GAP = 6;
const MARGIN = 8;
const MAX_WIDTH = 320;

let previous: AbortController | null = null;

export interface Tooltip {
  el: HTMLElement;
  /** Aborted when a later render replaces this tooltip; use it for window listeners. */
  signal: AbortSignal;
  /** Fill the tooltip, place it next to `anchor` and point `anchor` at it for screen readers. */
  show(anchor: HTMLElement, content: Node[]): void;
  hide(): void;
  /** The element the tooltip is showing for, if any. */
  readonly anchor: HTMLElement | null;
}

/**
 * A non-interactive tooltip, `position: fixed` on `document.body` so no ancestor's
 * container query or overflow can clip or offset it, and so it never changes the
 * document's height (inline cards auto-fit to that height).
 */
export function createTooltip(doc: Document): Tooltip {
  // One per document: a re-render replaces the old one.
  doc.querySelectorAll('.gl-tip').forEach((n) => n.remove());
  previous?.abort();
  const controller = (previous = new AbortController());
  const el = doc.createElement('div');
  el.className = 'gl-tip';
  el.id = 'gl-tip';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  doc.body.append(el);

  let anchor: HTMLElement | null = null;

  const win = doc.defaultView!;
  // Follow the term while the page scrolls (full screen, or a jump to another term); drop it once it's off screen.
  const follow = () => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    if (!anchor.isConnected || r.bottom < 0 || r.top > win.innerHeight) tip.hide();
    else place(el, anchor, win);
  };
  win.addEventListener('scroll', follow, { capture: true, passive: true, signal: controller.signal });
  win.addEventListener('resize', follow, { signal: controller.signal });

  const tip: Tooltip = {
    el,
    signal: controller.signal,
    get anchor() {
      return anchor;
    },
    show(next, content) {
      if (anchor && anchor !== next) anchor.removeAttribute('aria-describedby');
      anchor = next;
      anchor.setAttribute('aria-describedby', el.id);
      el.replaceChildren(...content);
      place(el, anchor, win);
    },
    hide() {
      anchor?.removeAttribute('aria-describedby');
      anchor = null;
      el.hidden = true;
    },
  };
  return tip;
}

/** Below the term when it fits, else above, else whichever side has more room; clamped to the viewport. */
export function place(tip: HTMLElement, anchor: HTMLElement, win: Window): void {
  const vw = win.innerWidth;
  const vh = win.innerHeight;
  tip.style.maxWidth = `${Math.max(0, Math.min(MAX_WIDTH, vw - 2 * MARGIN))}px`;
  tip.style.left = '0px';
  tip.style.top = '0px';
  tip.hidden = false;

  const r = anchor.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const fitsBelow = r.bottom + GAP + t.height <= vh - MARGIN;
  const fitsAbove = r.top - GAP - t.height >= MARGIN;
  const below = fitsBelow || (!fitsAbove && vh - r.bottom >= r.top);

  const top = below ? r.bottom + GAP : r.top - GAP - t.height;
  tip.style.top = `${clamp(top, MARGIN, vh - MARGIN - t.height)}px`;
  tip.style.left = `${clamp(r.left, MARGIN, vw - MARGIN - t.width)}px`;
  tip.dataset.side = below ? 'below' : 'above';
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
