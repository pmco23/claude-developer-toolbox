# Design: Documentation Restructure

**Date:** 2026-03-01
**Feature:** Slim README to ~100 lines; move detailed content to `docs/guides/` and `docs/skills/`

## Context

`README.md` has grown to 638 lines. It now contains installation guides, per-skill command references, MCP setup sections, walkthroughs, troubleshooting, and a language support matrix — all inline. The goal is a lean README that orients new users and links out to focused documentation files.

## Design

### Change 1: Rewrite `README.md` (~100 lines)

Keep only:
1. Title, tagline, and quote
2. Pipeline diagram (unchanged)
3. Prerequisites table — tool, purpose, install — with links to `docs/guides/mcp-setup.md` for MCP tools
4. Quick install — 3-step block (marketplace add → plugin install → restart)
5. Documentation links — two compact tables: Guides and Skills

Remove: all MCP setup sections, statusline setup, full installation walkthrough, Command Reference, language support matrix, end-to-end walkthrough, mode flag guide, `.pipeline/` state directory detail, troubleshooting.

### Change 2: Create `docs/guides/`

| File | Content |
|------|---------|
| `docs/guides/installation.md` | Full install steps, statusline setup, verify installation |
| `docs/guides/mcp-setup.md` | Codex, Repomix, and Grafana MCP setup + troubleshooting per server |
| `docs/guides/walkthrough.md` | End-to-end walkthrough, `--parallel`/`--sequential` mode guide, `.pipeline/` state directory reference, language support matrix |
| `docs/guides/troubleshooting.md` | All troubleshooting entries (gate not firing, MCP not connecting, resetting pipeline, verifying gate logic, plugin not loading) |

### Change 3: Create `docs/skills/`

One file per skill (19 total). Each file contains exactly the content currently in the Command Reference section for that skill: gate, writes, model, description, usage examples, flags.

| File | Skill |
|------|-------|
| `docs/skills/brief.md` | `/brief` |
| `docs/skills/design.md` | `/design` |
| `docs/skills/review.md` | `/review` |
| `docs/skills/plan.md` | `/plan` |
| `docs/skills/drift-check.md` | `/drift-check` |
| `docs/skills/build.md` | `/build` |
| `docs/skills/qa.md` | `/qa` |
| `docs/skills/cleanup.md` | `/cleanup` |
| `docs/skills/frontend-audit.md` | `/frontend-audit` |
| `docs/skills/backend-audit.md` | `/backend-audit` |
| `docs/skills/doc-audit.md` | `/doc-audit` |
| `docs/skills/security-review.md` | `/security-review` |
| `docs/skills/quick.md` | `/quick` |
| `docs/skills/init.md` | `/init` |
| `docs/skills/git-workflow.md` | `/git-workflow` |
| `docs/skills/plugin-architecture.md` | `/plugin-architecture` |
| `docs/skills/status.md` | `/status` |
| `docs/skills/pack.md` | `/pack` |
| `docs/skills/grafana.md` | `/grafana` |

## Files Affected

- `README.md` — rewritten to ~100 lines
- `docs/guides/installation.md` — new
- `docs/guides/mcp-setup.md` — new
- `docs/guides/walkthrough.md` — new
- `docs/guides/troubleshooting.md` — new
- `docs/skills/*.md` — 19 new files
