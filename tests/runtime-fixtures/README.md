# Runtime Fixtures

Curated transcript fixtures for the highest-risk workflow components:

- `/brief`
- `/build`
- `/cleanup`
- `/design`
- `/drift-check`
- `/init`
- `/pr-qa`
- `/qa`
- `/quick`
- `/review`
- `/rollback`
- `/test`
- `task-builder`

The `task-builder` fixtures include both:

- a successful contract handoff
- a blocked contract handoff with failing tests and non-empty blockers

The `/pr-qa` fixtures include:

- a parallel happy path with structured track results
- a docs-only skip path
- a missing-base-ref recovery path
- a non-git blocked path

The interview-system fixtures include:

- a `/brief` flow that proves additive requirement questions use multi-select semantics
- a verbose `/brief` request that only asks for the single missing blocker
- a terse `/brief` request that branches based on the user's first answer
- an `/init` flow that proves no field is re-asked when language, license, and project type are already present
- an `/init` empty-project setup where the user's first prompt already supplies the key scaffolding facts
- a `/quick` flow that accepts a free-form override instead of forcing a canned choice
- a `/quick` flow where "Just proceed" becomes an explicit assumption in the requirements handoff
- `/design` verbose and terse alignment flows that emit a requirements handoff before writing `.pipeline/design.md`
- `/drift-check` inferred and missing-input paths that prove source/target prompts are only used when needed
- `/test` detected-runner and ambiguous-runner paths that prove the runner question only appears when detection stays ambiguous
- a `/pr-qa` requirements-handoff path that proves diff collection is turned into an explicit execution contract
- a `/review` targeted follow-up path that focuses on the highest-impact unresolved finding
- a `/cleanup` targeted action-selection path that removes one item first instead of forcing a fixed sequence

Run the grader from the repository root:

```bash
node scripts/grade-runtime-fixtures.js
```

To grade a single fixture:

```bash
node scripts/grade-runtime-fixtures.js build-parallel-success
```

Each fixture directory contains:

- `transcript.jsonl` — a curated runtime-style transcript
- `grading.json` — discriminating assertions for that transcript

`grading.json` may also include:

- `provenance` — `curated` or `captured`

Fixture provenance:

- `provenance: "curated"` means the transcript was hand-authored to model the
  intended runtime contract
- `provenance: "captured"` means the transcript came from a real Claude Code run

The current `/pr-qa` fixtures are still curated. Add a real captured transcript
when one is available rather than relabeling a synthetic transcript.

These fixtures are designed to be easy to replace with real captured Claude Code transcripts later. The assertion model stays the same.
