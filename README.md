# domain-visualizer

Source for the **Domain Visualizer** Claude plugin, which shows a project's DDD domain (bounded contexts, ubiquitous-language glossary, avoided synonyms, relationships) as an interactive panel inside Claude, read from `GLOSSARY.md` / `GLOSSARY-MAP.md` files.

- What the plugin does and how to use it: [plugins/domain-visualizer/README.md](plugins/domain-visualizer/README.md)
- Architecture and rules for contributors (human or agent): [AGENTS.md](AGENTS.md)
- Build and test loops: [docs/DEVELOPING.md](docs/DEVELOPING.md)

Install in Claude Code from this repo:

```text
/plugin marketplace add <owner>/domain-visualizer
/plugin install domain-visualizer@domain-visualizer
```

MIT licensed.
