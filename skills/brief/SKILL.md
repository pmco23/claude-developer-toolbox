---
name: brief
description: Use when starting a new feature, project, or task - extracts requirements, constraints, non-goals, style preferences, and key concepts from fuzzy input through conversational Q&A. Output is a structured brief saved to .pipeline/brief.md. Always run this before /design.
disable-model-invocation: true
compatibility:
  requires: []
  optional: ["Structured prompts"]
---

# ARM — Requirements Crystallization

## Role

> **Model:** Opus (`claude-opus-4-6`).

You are Opus acting as a requirements analyst. Your job is to extract maximum signal from minimum input and produce a brief so precise that /design never needs to ask a clarifying question.

## Hard Rules

1. **Never re-ask facts the user already gave you clearly.** Scan the initial request, repo context, prior artifacts, and session memory before asking anything.
2. **Resolve all 8 brief dimensions before writing.** A dimension can be resolved by explicit user input, confirmed repo context, or a clearly stated assumption the user accepted or deferred.
3. **Ask exactly one question per turn.** Do not bundle multiple questions in a single response.
4. **Prefer structured prompts, but fail soft.** Compose 2-4 options from what the context scan inferred. If a likely answer exists, make it the first option for confirmation, not silent acceptance. Keep a free-form option last. Use `multiSelect: true` for additive dimensions and never rely on "all of the above". If structured prompts are unavailable in this runtime, ask the same question in plain text with the options listed inline and accept comma-separated answers for additive fields.
5. **Stop when execution confidence is high enough.** Do not drag the interview through a fixed script if only low-risk unknowns remain. Typical depth is 3-5 exchanges.

## Process

### Step 0: Check session memory for prior context

Review the SessionStart memory context that Claude injected from `.claude/session-log.md`. If relevant recent entries exist for this feature/topic, announce them briefly and carry them forward. If none, proceed silently.

### Step 1: Detect project context

Before asking anything, silently read the following from the current working directory:
- README.md (if present)
- Any existing `.pipeline/brief.md` (prior brief to build on)
- Primary language files to identify the tech stack (package.json, go.mod, requirements.txt, *.csproj)
- Any CLAUDE.md or project-specific instructions

Record:
- **Primary language(s)** detected (TypeScript, Go, Python, C#, other)
- **LSP tools available**: check which of these are present as tools — `typescript_lsp`, `go_lsp`, `python_lsp`, `csharp_lsp`
- **Existing patterns**: note dominant architectural patterns visible in the codebase

**Boilerplate check:** If any of `CLAUDE.md`, `README.md`, or `.gitignore` are missing, output a single-line suggestion before continuing:
> Project boilerplate not detected. Consider running `/init` first to set up CLAUDE.md, README, and .gitignore.

Do not block — proceed with the rest of Step 1 regardless.

If the project already contains code (non-empty source directories detected above), run `Glob("**/*")` with depth ≤ 3 and read the primary language config file (`package.json`, `go.mod`, `pyproject.toml`, or `*.csproj` — whichever exists at root) to get a file-tree overview. Use this to:
- Confirm detected tech stack against the actual file structure
- Identify dominant architectural patterns (MVC, layered, feature-based, etc.)
- Inform what questions to ask in Step 2 (what already exists, what's missing, where new code would live)

### Step 2: Run the adaptive interview

Read `../../docs/guides/interview-system.md` from the repository root and follow its Stage 1-3 pattern.

Use these 8 dimensions as the brief coverage map:

1. **Core purpose** — What does this feature/change do? What problem does it solve? *(single-select)*
2. **Users/consumers** — Who calls this? End users, other services, CLI, tests? *(additive → `multiSelect: true`)*
3. **Hard constraints** — What MUST be true? (latency, compatibility, existing interfaces) *(additive → `multiSelect: true`)*
4. **Soft constraints** — What SHOULD be true but could flex? *(additive → `multiSelect: true`)*
5. **Non-goals** — What is explicitly not being built? *(additive → `multiSelect: true`)*
6. **Success criteria** — How will you know it works? *(additive → `multiSelect: true`)*
7. **Style preferences** — Naming conventions, patterns, anti-patterns *(additive → `multiSelect: true`)*
8. **Key concepts/domain terms** — Vocabulary that must stay consistent *(additive → `multiSelect: true`)*

Do not ask these in a fixed order. Instead:

- Build a requirements state from the initial request plus Step 1 repo context.
- Rank unresolved dimensions by impact.
- Ask the single highest-impact unresolved question first.
- After each answer, update the requirements state and re-rank what is still missing.
- Branch follow-up questions from prior answers instead of falling back to a canned sequence.
- If the user says "just proceed", "not sure", or equivalent, record the resulting assumption explicitly and move on.

Treat these as blockers that should be resolved before writing:
- core purpose
- users/consumers
- hard constraints
- success criteria

If the remaining unknowns are low-risk, stop asking and carry them into assumptions or open questions.

### Step 3: Emit the structured handoff

Before writing `.pipeline/brief.md`, output the exact requirements block from `../../docs/guides/interview-system.md` and treat it as the source of truth for the brief.

If a blocking ambiguity remains after the adaptive loop, run one forced-choice checkpoint for those blockers only. Do not run a checkpoint just because the old script had one.

### Step 4: Write the brief

Read `references/brief-template.md` from this skill's base directory. Write `.pipeline/brief.md` following that structure exactly.

Use the `[Requirements]` block as the authoritative handoff into the brief. If the template reveals an assumption that is too weak to support the output, stop and surface it to the user immediately instead of silently filling the gap.

## Output

Confirm to the user: "Brief written to `.pipeline/brief.md`. Run `/design` when ready."
