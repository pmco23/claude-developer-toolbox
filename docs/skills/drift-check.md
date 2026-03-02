# /drift-check — Drift Detection

**Gate:** `.pipeline/plan.md` must exist
**Writes:** nothing (report only)
**Models:** `drift-verifier` agent (Sonnet) + Codex via Codex MCP + Opus (lead)

Two agents independently extract claims from a source-of-truth document and verify each against a target. Lead reconciles conflicts and mitigates drift.

## Usage

```
/drift-check
```
