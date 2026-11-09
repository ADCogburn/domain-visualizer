import { readdir, readFile, stat } from 'node:fs/promises';
import { basename as pathBasename, dirname as pathDirname, join, relative, resolve, sep } from 'node:path';
import { normalizeRelative } from './paths.js';
import type { FileSource } from './types.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', 'vendor', 'target']);
const MAX_DEPTH = 6;
const MAX_FILES = 5000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * A FileSource over a project folder (or a single glossary file inside one).
 * Reads are confined to the root folder and to files up to 2 MB.
 */
export async function diskSource(path: string): Promise<FileSource> {
  const abs = resolve(path);
  const info = await stat(abs).catch(() => null);
  if (!info) throw new Error(`Path not found: ${abs}`);
  const root = info.isDirectory() ? abs : pathDirname(abs);
  const entry = info.isDirectory() ? undefined : pathBasename(abs);

  const toAbs = (rel: string): string | null => {
    const p = normalizeRelative(rel);
    if (p === null) return null;
    const full = join(root, ...p.split('/'));
    const back = relative(root, full);
    return back.startsWith('..') || back.includes(`..${sep}`) ? null : full;
  };

  return {
    label: root,
    entry,
    async read(rel) {
      const full = toAbs(rel);
      if (!full) return undefined;
      const s = await stat(full).catch(() => null);
      if (!s?.isFile() || s.size > MAX_FILE_BYTES) return undefined;
      return readFile(full, 'utf8').catch(() => undefined);
    },
    async listMarkdown() {
      const out: string[] = [];
      const walk = async (dir: string, rel: string, depth: number) => {
        if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
        const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const e of entries) {
          if (out.length >= MAX_FILES) return;
          const childRel = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) {
            if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) await walk(join(dir, e.name), childRel, depth + 1);
          } else if (e.isFile() && /\.md$/i.test(e.name)) out.push(childRel);
        }
      };
      await walk(root, '', 0);
      return out;
    },
  };
}
