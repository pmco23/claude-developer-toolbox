# /plan — Atomic Execution Planning

**Gate:** `.pipeline/design.approved` must exist
**Writes:** `.pipeline/plan.md`
**Model:** Opus

Transforms the approved design into an execution document precise enough that build agents never ask clarifying questions. ~5 tasks per agent group. Exact file paths. Complete code examples. Named test cases with setup and assertions defined at plan time. Flags which task groups are safe for parallel execution.

## Usage

```
/plan
```
