# /design — First-Principles Design

**Gate:** `.pipeline/brief.md` must exist
**Writes:** `.pipeline/design.md`
**Model:** Opus
**Tools used:** Context7, web search, LSP (if available)

Reads the brief and performs first-principles analysis. Classifies every constraint as hard or soft. Flags soft constraints being treated as hard. Grounds all library and pattern recommendations in live docs via Context7 before drawing conclusions. Iterates with you until alignment. Output is a formal design document.

## Usage

```
/design
```
