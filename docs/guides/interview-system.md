# Adaptive Interview System

Use this pattern in any skill that needs to gather requirements before doing work.
It replaces fixed question scripts with a lightweight three-stage loop:

1. Context scan
2. Adaptive questioning
3. Structured requirements handoff

The goal is to gather enough signal to execute confidently without turning the
conversation into a form.

## Prompt Taxonomy

Use one of these three prompt types. Do not blur them together.

### 1. Full Interview

Use for requirement-gathering workflows where Claude still needs execution
inputs before it can proceed safely.

Rules:

- Ask one question at a time
- Ask only about missing or ambiguous information
- Emit a `[Requirements]` block before execution
- Use `multiSelect: true` for additive fields
- Always include a free-form option

Examples:
- `/brief`
- `/design`
- `/drift-check` when inputs are not fully known
- `/test` when runner or scope is unclear
- `/pr-qa` when base or scope details are unresolved

### 2. Adaptive Branch

Use for approval or revision loops where the main task is already underway and
Claude needs the next high-impact decision from the user.

Rules:

- Ask one targeted branch question at a time
- Change the next question based on the prior answer or current findings
- Do not emit a full `[Requirements]` block unless the skill actually re-enters
  requirement gathering
- Always include a free-form option

Examples:
- `/review`
- `/cleanup`
- `/design` alignment/revision loop

### 3. Micro-Prompt

Use for bounded confirmations and mode pickers.

Rules:

- Keep the prompt single-select
- Do not include a free-form option unless the skill explicitly supports a
  custom mode
- Do not emit a `[Requirements]` block
- Do not turn a confirmation into a mini interview

Examples:
- `/build` mode selection
- `/qa` mode selection
- `/reset` confirmation
- `/rollback` scope confirmation
- `/git-workflow` destructive-op confirmation
- `/status` next-step prompt

## Stage 1: Context Scan

Before asking anything, extract what the user already gave you.

Capture these fields:

- `goal` — what outcome the user wants
- `inputs` — files, data, URLs, paths, prior artifacts, or examples already provided
- `constraints` — hard limits on scope, compatibility, latency, format, tone, length, safety, or deadlines
- `format_preferences` — output shape, file destination, naming, tone, structure
- `domain_signals` — stack, platform, audience, business vocabulary, repo conventions
- `implicit_assumptions` — facts that are likely true from repo context or prior turns but not yet confirmed

Rules:

- Never re-ask a fact the user already stated clearly.
- Prefer inference over interrogation when the risk is low.
- Treat repo context as evidence: existing files, config, prior pipeline artifacts, and session memory can close gaps before any question is needed.
- Separate unknowns into:
  - `blocking` — cannot execute safely without resolving
  - `important` — strongly affects quality or output shape
  - `optional` — nice to know, but safe to assume

## Stage 2: Adaptive Questioning

Ask one question at a time, highest impact first.

Question ordering priority:

1. Blockers that determine what to build or transform
2. Constraints that can invalidate the approach
3. Output format or destination
4. Domain-specific choices unlocked by prior answers
5. Nice-to-have polish

After every answer:

1. Update the requirements state
2. Re-rank what is still missing
3. Decide whether another question is justified

Stop when execution confidence is high enough, usually after 3-5 exchanges.

Branching rules:

- A confirmed answer should unlock narrower follow-ups, not the next generic question.
- If the user says `just proceed`, `not sure`, or equivalent, accept that immediately.
- Record the default as an assumption and continue.
- If all remaining unknowns are low-risk, stop asking and move to execution.

Tone rules:

- Match the user's sophistication. Use technical language with technical users and plain language with everyone else.
- Keep questions conversational. Offer options when they reduce effort.
- Do not ask omnibus questions like "anything else?" when a specific blocker still exists.

Selection rules:

- Use `multiSelect: true` for additive fields such as:
  - constraints
  - non-goals
  - success criteria
  - affected users or consumers
  - style preferences
  - domain concepts that may validly co-exist
- Use single-select for mutually exclusive choices such as:
  - mode selection
  - overwrite policy
  - base ref choice
  - architecture direction when the options are alternatives
  - alignment verdict
- Always include a free-form option on full interviews and adaptive branches.
  Recommended labels:
  - `Other / let me describe it`
  - `Other / let me explain`
- Do not use `all of the above` when multi-select is available.
- If structured prompts are unavailable:
  - additive questions fall back to a plain-text comma-separated answer
  - mutually exclusive questions fall back to a single concise plain-text choice
  - do not replace multi-select with `all of the above`

## Stage 3: Structured Requirements Handoff

Before execution, emit a compact requirements block and treat it as the working contract.

Use this exact shape:

```text
[Requirements]
Goal:           <what the user wants>
Inputs:         <files, data, or context provided>
Constraints:    <format, length, tone, scope, compatibility, safety, etc.>
Assumptions:    <anything inferred or defaulted>
Open questions: <anything deferred by the user>
```

Execution rules:

- Reference this block explicitly before making changes or generating output.
- Do not discard interview results after the last question.
- If an assumption proves wrong during execution, stop and surface it immediately instead of silently proceeding.

Exceptions:

- Destructive confirmations, forced checkpoints, and bounded yes/no prompts do
  not need a free-form option.
- Only full interviews emit `[Requirements]`. Adaptive branches may use a
  smaller state summary if the skill needs it. Micro-prompts never emit
  `[Requirements]`.

## Minimal Drop-In Pattern

Use this skeleton inside a skill:

```text
1. Scan the user request, repo context, and prior artifacts.
2. Build a requirements state with known facts, assumptions, and missing items.
3. Ask one highest-impact question only if a blocker or important ambiguity remains.
4. After each answer, update the state and decide whether another question is still worth it.
5. Emit the [Requirements] block.
6. Execute using that block as the source of truth.
7. If execution disproves an assumption, pause and surface it.
```

## Integration Guide

Example: generic file transformation skill.

User request:
`Convert these CSV exports into a customer summary JSON file.`

### Old pattern

- Ask for input file
- Ask for output path
- Ask for JSON shape
- Ask for overwrite preference
- Ask for date handling

This is slow and often re-asks facts already present in the request or repo.

### New pattern

1. Context scan
   - infer goal: transform CSV to summary JSON
   - inspect mentioned files or repo exports directory
   - infer likely output location from adjacent conventions
   - detect whether the user already asked for one file or many
2. Adaptive questioning
   - ask only the highest-impact unknown, for example:
     - "Should this produce one combined summary or one JSON file per CSV?"
   - if the user says "one combined file", ask the next question only if it still matters
   - if output location is still ambiguous, ask that next
3. Handoff
   - emit `[Requirements]`
   - run the transformation using the block as the execution contract

### Example drop-in wording

```text
Before asking anything, scan the request and repo context for the goal, inputs,
constraints, format preferences, and domain signals. Ask only about what is
still missing or ambiguous. Ask one question at a time, highest impact first.
Use multi-select for additive fields, keep a free-form option available, and
never rely on "all of the above" as a shortcut. Stop when execution confidence
is high enough. Before executing, emit the [Requirements] block and use it as
the source of truth for the rest of the skill.
```

## Annotated Transcript: Verbose User

User:
`I need a script that converts our billing CSV export into JSON for the finance dashboard. It needs to keep customer IDs stable, preserve the original invoice dates, and write the output to scripts/fixtures/billing-summary.json so tests can use it.`

Assistant:
`[Requirements]
Goal:           Convert the billing CSV export into JSON for the finance dashboard and test fixtures.
Inputs:         Billing CSV export mentioned in the request; existing repo context still to be checked.
Constraints:    Preserve stable customer IDs; preserve original invoice dates; output path is scripts/fixtures/billing-summary.json.
Assumptions:    The input CSV is already present in the repo; one combined JSON file is desired.
Open questions: Input file path is still ambiguous.`

Assistant:
`I only need one thing before I can proceed: which CSV file should I transform?`

Annotation:
- No questions about JSON path, stable IDs, or date handling because the user already gave them.
- Only the true blocker is asked.

User:
`Use data/billing/export-2026-03.csv.`

Assistant:
`[Requirements]
Goal:           Convert the billing CSV export into JSON for the finance dashboard and test fixtures.
Inputs:         data/billing/export-2026-03.csv
Constraints:    Preserve stable customer IDs; preserve original invoice dates; write scripts/fixtures/billing-summary.json.
Assumptions:    One combined JSON file is desired.
Open questions: None.
`

Annotation:
- Interview ended after one exchange because execution confidence is already high.

## Annotated Transcript: Terse User

User:
`Make the import script handle CSV better.`

Assistant:
`Do you want this change to improve parsing, output shape, or failure handling?`

Annotation:
- The initial request is underspecified, so the first question targets the highest-impact ambiguity.

User:
`Parsing and better errors.`

Assistant:
`What input should I optimize for: one known CSV format, or multiple vendor CSV formats?`

Annotation:
- The second question branches from the first answer instead of following a canned script.

User:
`Just our current export.`

Assistant:
`[Requirements]
Goal:           Improve the import script's CSV handling.
Inputs:         Existing import script and the current in-house CSV export format.
Constraints:    Focus on parsing correctness and clearer errors.
Assumptions:    No new output format is required; support for other vendor CSV formats is out of scope unless discovered in code.
Open questions: None.
`

Annotation:
- The interview stops after the minimum useful context is gathered.
- Remaining low-risk details are captured as assumptions instead of forcing another question.

## Adoption Notes

- Use this pattern for requirement-gathering and approval-heavy skills.
- Do not use it for simple confirmations like overwrite/skip/merge or yes/no audit prompts.
- Keep the skill-specific field list narrow. The adaptive loop should operate on the fields that matter for that skill, not on a generic master questionnaire.
- If a skill only needs a bounded confirmation or mode picker, use the
  micro-prompt pattern instead of forcing a full interview.
