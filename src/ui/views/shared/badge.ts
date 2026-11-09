/** A small pill for an ADR's status; `data-status` lets CSS tint accepted / superseded / … */
export function statusBadge(doc: Document, status: string): HTMLElement {
  const span = doc.createElement('span');
  span.className = 'dv-status';
  span.dataset.status = status.toLowerCase().split(/\s+/)[0] ?? '';
  span.textContent = status;
  return span;
}
