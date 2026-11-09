/**
 * Normalise a repo-relative path to POSIX form with no leading "./".
 * Returns null if the path is absolute or climbs above the root.
 */
export function normalizeRelative(path: string): string | null {
  const p = path.replace(/\\/g, '/').trim();
  if (!p || p.startsWith('/') || /^[a-zA-Z]:\//.test(p)) return null;
  const out: string[] = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (!out.length) return null;
      out.pop();
    } else out.push(seg);
  }
  return out.length ? out.join('/') : null;
}

/** Join a link target to the directory of the file that contains it. */
export function resolveFrom(fromFile: string, target: string): string | null {
  const dir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : '';
  const clean = target.split('#')[0]!.split('?')[0]!;
  return normalizeRelative(dir ? `${dir}/${clean}` : clean);
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function dirname(path: string): string {
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
}
