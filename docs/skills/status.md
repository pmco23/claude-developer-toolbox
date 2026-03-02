# /status — Pipeline State Check

**Gate:** None (always available)
**Writes:** nothing
**Model:** Haiku (`claude-haiku-4-5`)

Reports pipeline phase, artifact ages, and Repomix pack stats. When no pipeline is active, shows available workflow paths and always-available skills. Run at any point to know where you are and what to run next.

## Usage

```
/status
```

## Cold-start output (no pipeline active)

```
No pipeline active.

Choose a workflow:

  Fast Track — small features, bug fixes, well-understood changes
    /quick [--deep]         implement directly, no artifacts

  Pipeline — new features, design-sensitive or complex changes
    /brief                  crystallize requirements  →  .pipeline/brief.md
      /design               first-principles design   →  .pipeline/design.md
        /review             adversarial review        →  .pipeline/design.approved
          /plan             atomic execution plan     →  .pipeline/plan.md
            /build          coordinated build         →  .pipeline/build.complete
              /qa           post-build audits

Always available (no pipeline required):
  /init          scaffold README, CHANGELOG, CONTRIBUTING, .gitignore
  /git-workflow  before branch creation, first push, PR, destructive ops
  /pack          Repomix snapshot — run before /qa for token efficiency
  /status        this report

See docs/guides/workflows.md for the full decision guide.
```

## Mid-task output (pipeline active)

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
