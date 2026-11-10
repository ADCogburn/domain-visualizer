import { adrNumber, type Adr, type Term } from '../../../model/types.js';
import './chat.css';

let previous: AbortController | null = null;

/** Ready-made text for one item, for the user to paste into the chat box. */
export const termPrompt = (t: Term) => `I want to ask about the Term "${t.name}" (${t.context}).`;
export const contextPrompt = (name: string) => `I want to ask about the Bounded Context "${name}".`;
export const adrPrompt = (a: Adr) => `I want to ask about the ADR ${a.number === null ? '' : `${adrNumber(a.number)}-`}${a.title}`;

export interface ChatBoxes {
  /**
   * A "Chat about this" button. Clicking it opens a read-only box with `text` at the end
   * of `container` (in flow, so the inline card grows); clicking it again closes it.
   * `subject` names the item for screen readers.
   */
  button(text: string, container: HTMLElement, subject: string): HTMLButtonElement;
}

/**
 * "Chat about this" boxes for one rendered page. Nothing is sent to the host: the user
 * copies the text and pastes it into the chat box themselves.
 */
export function createChatBoxes(doc: Document): ChatBoxes {
  // One set per document: a re-render replaces the old one's Escape listener.
  previous?.abort();
  const controller = (previous = new AbortController());

  let seq = 0;
  /** The one open box and the button that opened it. */
  let open: { btn: HTMLButtonElement; box: HTMLElement } | null = null;

  const close = () => {
    if (!open) return;
    const { btn, box } = open;
    const hadFocus = box.contains(doc.activeElement);
    box.remove();
    btn.setAttribute('aria-expanded', 'false');
    open = null;
    if (hadFocus) btn.focus({ preventScroll: true });
  };

  doc.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && open) close();
    },
    { signal: controller.signal },
  );

  return {
    button(text, container, subject) {
      const id = `dv-chat-${++seq}`;
      const btn = el(doc, 'button', 'dv-chat-btn', 'Chat about this');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Chat about this: ${subject}`);
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', id);
      container.classList.add('dv-chat-scope');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const same = open?.btn === btn;
        close();
        if (same) return;
        const box = el(doc, 'div', 'dv-chat-box');
        box.id = id;
        const copy = el(doc, 'button', 'dv-chat-copy', 'Copy');
        copy.type = 'button';
        const p = el(doc, 'p', 'dv-chat-text', text);
        copy.addEventListener('click', () => void copyText(doc, p, copy));
        box.append(p, copy);
        container.append(box);
        btn.setAttribute('aria-expanded', 'true');
        open = { btn, box };
      });
      return btn;
    },
  };
}

/** How long "Copied" shows before the button reads "Copy" again. */
const COPIED_MS = 1500;
const resets = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/**
 * Copy `p`'s text with the async Clipboard API, then the older execCommand. Sandboxed
 * hosts may block both; then the text is left selected and the user copies it by hand.
 */
async function copyText(doc: Document, p: HTMLElement, btn: HTMLButtonElement) {
  const text = p.textContent ?? '';
  const win = doc.defaultView;
  clearTimeout(resets.get(btn));
  let ok = false;
  try {
    await win!.navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    select(doc, p);
    try {
      ok = typeof doc.execCommand === 'function' && doc.execCommand('copy');
    } catch {
      ok = false;
    }
  }
  if (!btn.isConnected) return;
  if (ok) {
    btn.textContent = 'Copied';
    resets.set(
      btn,
      setTimeout(() => (btn.textContent = 'Copy'), COPIED_MS),
    );
  } else {
    select(doc, p);
    const mac = /Mac|iPhone|iPad/.test(win?.navigator.platform ?? '');
    btn.textContent = `Press ${mac ? '⌘C' : 'Ctrl+C'} to copy`;
  }
}

function select(doc: Document, node: HTMLElement) {
  const sel = doc.getSelection();
  if (!sel) return;
  const range = doc.createRange();
  range.selectNodeContents(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const n = doc.createElement(tag);
  n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
