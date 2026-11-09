---
name: domain-visualizer
description: Show a project's domain language (DDD ubiquitous language, bounded contexts, glossary terms, definitions, avoided synonyms) with the show_domain tool. Use when the user asks to see, show, browse, visualize or explain the project's glossary, domain model, ubiquitous language, bounded contexts or GLOSSARY.md / GLOSSARY-MAP.md / CONTEXT.md, or asks what a domain term means in this project.
---

# Show the domain

Call the `show_domain` tool from the `domain-visualizer` MCP server. Pass exactly one of:

- `path`: the project folder, or one glossary file. Use this when the tool can read the user's files (Claude Code, or a Cowork session on the user's computer). Use `"."` for the current project.
- `files`: `[{ "path": "GLOSSARY-MAP.md", "content": "..." }, { "path": "src/billing/GLOSSARY.md", "content": "..." }]` with each file's raw Markdown. Use this when the server can't see the files, for example when the user pasted or attached them. Keep the repo-relative paths so the links in GLOSSARY-MAP.md resolve.

The tool reads `GLOSSARY-MAP.md` and the glossaries it links to, or a single `GLOSSARY.md`, and falls back to the older names `CONTEXT-MAP.md` and `CONTEXT.md`.

Where Claude can display MCP Apps (claude.ai and Claude Desktop), the result opens an interactive glossary panel, so don't repeat the whole glossary in your reply: summarise it in a sentence or two and mention any warnings. Where it can't (Claude Code), the tool's text result is the glossary: show the user the parts they asked about.

If the `show_domain` tool isn't available, read the glossary files yourself and answer from them.
