---
name: domain-visualizer
description: Show a project's domain language (DDD ubiquitous language, bounded contexts, glossary terms, definitions, avoided synonyms) and its architecture decision records (ADRs) with the show_domain tool. Use when the user asks to see, show, browse, visualize or explain the project's glossary, domain model, ubiquitous language, bounded contexts, ADRs or GLOSSARY.md / GLOSSARY-MAP.md / CONTEXT.md / docs/adr, or asks what a domain term means in this project.
---

# Show the domain

Call the `show_domain` tool from the `domain-visualizer` MCP server. Pass exactly one of:

- `path`: the project folder, or one glossary file. Use this when the tool can read the user's files (Claude Code, or a Cowork session on the user's computer). Use `"."` for the current project.
- `files`: `[{ "path": "GLOSSARY-MAP.md", "content": "..." }, { "path": "src/billing/GLOSSARY.md", "content": "..." }, { "path": "docs/adr/0001-slug.md", "content": "..." }]` with each file's raw Markdown. Use this when the server can't see the files, for example when the user pasted or attached them. Keep the repo-relative paths so the links in GLOSSARY-MAP.md resolve and ADRs land in the right context.

Optional: `view` (`"home"`, the default, lists the project's artifacts; `"glossary"` opens the glossary directly) and `project` (the name shown at the top; defaults to package.json `name`, then the folder name).

The tool reads `GLOSSARY-MAP.md` and the glossaries it links to, or a single `GLOSSARY.md`, and falls back to the older names `CONTEXT-MAP.md` and `CONTEXT.md`. It also reads ADRs from `docs/adr/` at the root (project-wide) and next to each context's glossary.

Where Claude can display MCP Apps (claude.ai and Claude Desktop), the result opens an interactive panel, so don't repeat the whole glossary or the ADRs in your reply: summarise in a sentence or two and mention any warnings. Where it can't (Claude Code), the tool's text result is the content: show the user the parts they asked about.

If the `show_domain` tool isn't available, read the glossary and ADR files yourself and answer from them.
