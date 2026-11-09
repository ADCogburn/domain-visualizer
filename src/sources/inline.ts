import { normalizeRelative } from './paths.js';
import type { FileSource } from './types.js';

export interface InlineFile {
  path: string;
  content: string;
}

/**
 * A FileSource over files passed as tool arguments. Never touches the filesystem,
 * so it is safe for a remote server.
 */
export function inlineSource(files: InlineFile[]): FileSource {
  const byPath = new Map<string, string>();
  for (const f of files) {
    const p = normalizeRelative(f.path) ?? normalizeRelative(f.path.replace(/^.*[\\/]/, ''));
    if (p) byPath.set(p, f.content);
  }
  const paths = [...byPath.keys()];
  return {
    label: 'inline files',
    // One file is the glossary, whatever it's called.
    entry: paths.length === 1 ? paths[0] : undefined,
    read: async (path) => {
      const p = normalizeRelative(path);
      return p === null ? undefined : byPath.get(p);
    },
    listMarkdown: async () => paths.filter((p) => /\.md$/i.test(p)),
  };
}
