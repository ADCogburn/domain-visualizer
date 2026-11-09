# Domain Visualizer

Shows a project's domain language and design decisions, read from the project's own documents.

## Language

### Projects and artifacts

**Project**:
The codebase being visualized, known by one display name.
_Avoid_: Repo, workspace

**Artifact**:
A document in a Project that the visualizer can show, such as the Glossary or an ADR.
_Avoid_: File, doc, document

**Glossary**:
The Artifact made of all of a Project's glossary files taken together, across every Bounded Context.
_Avoid_: Context file, ubiquitous language file

**ADR**:
An Artifact recording one architecture decision, belonging to a Bounded Context or to the whole Project.
_Avoid_: ARD, decision record, decision doc

**Home**:
The first page of the visualizer: the Project's name and its list of Artifacts.
_Avoid_: Landing page, default view, index

### Language

**Bounded Context**:
A part of the Project with its own consistent language, described by one glossary file.
_Avoid_: Module, domain

**Term**:
A word or phrase a Bounded Context defines in its Glossary.
_Avoid_: Keyword, entry

**Avoided Word**:
A synonym a Bounded Context has agreed not to use, pointing at the Term to use instead.
_Avoid_: Banned word, alias
