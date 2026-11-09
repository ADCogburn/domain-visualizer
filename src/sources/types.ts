/**
 * Where domain files come from. Parsers read through this interface only, so they never
 * know whether text came from disk (local server) or from tool arguments (remote server).
 *
 * All paths are repo-relative, POSIX-style, with no leading "./".
 */
export interface FileSource {
  /** Shown in summaries, e.g. the project root or "inline files". */
  label: string;
  /** A specific file the caller pointed at, if any. Parsers load it instead of discovering. */
  entry?: string;
  /** File text, or undefined when the file doesn't exist or can't be read. */
  read(path: string): Promise<string | undefined>;
  /** Every Markdown file in the source (bounded; skips dependency and build folders). */
  listMarkdown(): Promise<string[]>;
}
