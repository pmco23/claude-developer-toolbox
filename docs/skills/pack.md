# /pack — Repomix Codebase Snapshot

**Gate:** None (always available — requires Repomix MCP)
**Writes:** `.pipeline/repomix-pack.json`
**Model:** Haiku (`claude-haiku-4-5`)

Packs the local codebase using Repomix MCP and stores the outputId in `.pipeline/repomix-pack.json`. Run before `/qa` to share one compressed pack across all five audit agents (significant token reduction via Tree-sitter compression — ratio reported after each pack). `/qa` automatically uses the stored pack if it is less than 1 hour old.

If Repomix MCP is not installed, this skill will fail. Other skills (`/qa`, `/plan`, `/brief`) fall back to native file tools when no pack is available.

## Usage

```
/pack              # pack current working directory
/pack src/         # pack a subdirectory
```
