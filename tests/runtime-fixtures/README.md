# Runtime Fixtures

Curated transcript fixtures for the highest-risk workflow components:

- `/build`
- `/qa`
- `/review`
- `/rollback`
- `task-builder`

The `task-builder` fixtures include both:

- a successful contract handoff
- a blocked contract handoff with failing tests and non-empty blockers

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

These fixtures are designed to be easy to replace with real captured Claude Code transcripts later. The assertion model stays the same.
