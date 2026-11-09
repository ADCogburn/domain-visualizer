import type { FileSource } from '../sources/types.js';

/** The Project's display name: `name` in a root package.json, else the folder's name, else "Domain". */
export async function projectName(source: FileSource): Promise<string> {
  const pkg = await source.read('package.json');
  if (pkg !== undefined) {
    try {
      const name = (JSON.parse(pkg) as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim()) return name.trim();
    } catch {
      // Not JSON: fall through to the folder name.
    }
  }
  return source.folderName || 'Domain';
}
