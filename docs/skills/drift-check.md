# /drift-check — Drift Detection

**Gate:** `.pipeline/plan.md` must exist
**Writes:** nothing (report only)
**Models:** Sonnet (agent 1) + Codex via Codex MCP (agent 2) + Opus (lead)

Two agents independently extract claims from a source-of-truth document and verify each against a target. Lead reconciles conflicts and mitigates drift.

## Usage

```
/drift-check
```
