# Domain Visualizer

Shows your project's domain language inside Claude: the DDD bounded contexts, the glossary terms that make up each context's ubiquitous language, their definitions, and the synonyms your team has agreed to avoid.

It reads the files written by the [`domain-modeling` skill](https://github.com/mattpocock/skills) format:

- `GLOSSARY.md`: one context, with an H1 name, a short description, and a `## Language` section of `**Term**:` entries with an optional `_Avoid_:` line.
- `GLOSSARY-MAP.md`: for repos with several contexts, a list of `- [Context](./path/GLOSSARY.md): purpose` lines and a `## Relationships` section.
- The older names `CONTEXT.md` and `CONTEXT-MAP.md` work too.

## Install

In Claude Code:

```text
/plugin install domain-visualizer --marketplace <owner>/domain-visualizer
```

In claude.ai or Claude Desktop: **Customize > Plugins > Add > Add marketplace**, enter `<owner>/domain-visualizer`, then add **Domain Visualizer**.

## Use it

Type `/domain-visualizer` to open **Home**: the project's name and its artifacts (the glossary and the ADRs). Pick one, or carry on chatting about something else. You can also just ask something like "show me this project's domain glossary" or "what does Invoice mean here?". Either way Claude calls the `show_domain` tool and opens Home.

- Where Claude can show MCP Apps, you get an interactive panel. Pick the glossary or an ADR from Home. Glossary terms have a dotted underline; hover or focus one to see its definition. Avoided words are greyed out and point to the term to use instead. Use **Full screen** for the whole glossary.
- Everywhere else, including Claude Code, you get the same glossary as text.

`show_domain` takes either `path` (a project folder or glossary file to read) or `files` (the raw Markdown, for when the server can't see your files).

## Where it works

The tool comes from a local MCP server that this plugin starts with `node` (Node.js 20 or later must be installed). Claude loads local plugin servers in Claude Code and in Cowork sessions that run on your computer; regular claude.ai chat ignores them, and there the plugin's skill still tells Claude how to read your glossary files. To get the panel in Claude Desktop chat today, add the server to Claude Desktop's own config; see `docs/DEVELOPING.md` in the source repository.

## Data and privacy

Nothing leaves your machine. The server only reads Markdown glossary files inside the project folder you point it at, keeps nothing on disk, and makes no network requests. The panel loads no external scripts, fonts or images. What Claude itself does with the tool's result follows your normal Claude data settings.

## License

MIT
