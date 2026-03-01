# Model References Design

**Goal:** Add formal `> **Model:**` blocks to all 14 skills that are missing them, so every skill consistently documents which Anthropic model it is optimised for.

**Approach:** Pure documentation — no skill logic changes, no flag routing. Matches the format already used in `brief`, `design`, `plan`, `drift-check`, and `build`.

---

## Classification

### Opus (`claude-opus-4-6`)

| Skill | Rationale |
|-------|-----------|
| `review` | Adversarial orchestration, cost/benefit reasoning, Context7 grounding before critiquing |

### Sonnet (`claude-sonnet-4-6`)

| Skill | Rationale |
|-------|-----------|
| `qa` | Orchestrates dispatch of 5 audit agents; moderate coordination logic |
| `quick` | Default implementer; Sonnet already referenced inline but needs formal block |
| `init` | Context extraction across multiple file types + multi-file scaffolding |
| `backend-audit` | Code review requiring understanding of language idioms and project conventions |
| `frontend-audit` | Code review requiring understanding of frontend patterns and conventions |
| `doc-audit` | Semantic drift detection between documentation and implementation |
| `security-review` | OWASP vulnerability analysis requiring security reasoning |
| `git-workflow` | Conditional workflow enforcement with safety gate logic |
| `grafana` | ReAct loop with observability reasoning across multiple tool types |
| `plugin-architecture` | Decision guide requiring understanding of architecture trade-offs |

### Haiku (`claude-haiku-4-5`)

| Skill | Rationale |
|-------|-----------|
| `status` | Purely mechanical: read 5 files, compute ages, format output |
| `pack` | Call one MCP tool with parameters, write one JSON file |
| `cleanup` | Pattern-match dead code; no semantic reasoning required |

---

## Format

**Placement:** Immediately after the `## Role` header, before the first paragraph.

**Wording by tier:**

```markdown
> **Model:** Opus (`claude-opus-4-6`). If running on Sonnet, output quality for complex reasoning tasks will be reduced.
```

```markdown
> **Model:** Sonnet (`claude-sonnet-4-6`). If running on Haiku, output quality may be reduced for tasks requiring judgment.
```

```markdown
> **Model:** Haiku (`claude-haiku-4-5`). Haiku is sufficient for this task. Sonnet or Opus will also work.
```

---

## Out of Scope

- No changes to `docs/skills/` reference pages (model already listed there from docs restructure)
- No flag routing or model-switching logic
- No changes to the 5 skills that already have correct blocks (`brief`, `design`, `plan`, `drift-check`, `build`)
