# /status — Pipeline State Check

**Gate:** None (always available)
**Writes:** nothing
**Model:** inherits from calling context

Reports the current pipeline phase based on which `.pipeline/` artifacts exist, including file age for each artifact and Repomix pack stats. Run at any point to know where you are and what to run next.

## Usage

```
/status
```

## Example output

```
Pipeline status: Plan ready / build in progress

  brief.md         ✓ 2h 14m old
  design.md        ✓ 1h 52m old
  design.approved  ✓ 1h 30m old
  plan.md          ✓ 23m old
  build.complete   ✗ missing
  repomix-pack     ✓ 18m old — 142 files, 28400 tokens

Next: Run /build
```
