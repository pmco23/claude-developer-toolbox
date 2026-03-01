# /git-workflow — Git Discipline

**Gate:** None (always available)
**Writes:** nothing
**Model:** Sonnet (`claude-sonnet-4-6`)

Enforces correct branching, commit message format, and safety checks before any significant git operation. Detects whether the project is code (trunk-based) or infrastructure (three-environment) and loads the appropriate workflow reference.

Also referenced in `/build` (builders invoke it before committing) and `/quick` (invoked during self-review before committing).

## Usage

```
/git-workflow     # standalone — run before branch creation, first push, PR open/merge,
                  # or any destructive operation (force-push, reset --hard, branch -D)
```

## Project type detection

| Signal | Workflow |
|--------|---------|
| `*.tf`, `*.tfvars`, `Chart.yaml`, `helm/`, `terraform/` | Three-environment: development → preproduction → main |
| `*.ts`, `*.js`, `*.py`, `*.go`, `*.rs`, `*.java`, `*.cs` | Trunk-based: feature branch → main |
| Ambiguous | Asks you to confirm |

## Safety gate

Blocks or asks confirmation for:
- Non-conforming branch names or commit messages (rewrites message before proceeding)
- Destructive operations (force-push, reset --hard, branch -D)
- Direct push to protected branches (main, master, development, preproduction)
