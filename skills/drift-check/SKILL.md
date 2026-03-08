---
name: drift-check
description: Use to detect drift between a source-of-truth document and a target document or implementation. Dispatches drift-verifier (Sonnet) and path-verifier (Sonnet) in parallel — semantic claim analysis and structural path/symbol verification. Requires .pipeline/plan.md. Used internally by /build and available standalone.
compatibility:
  requires: ["Claude Code Task tool"]
  optional: ["Structured prompts"]
---

# PMATCH — Drift Detection

## Role

> **Model:** Opus (`claude-opus-4-6`).

You are Opus acting as a verification lead. Two independent agents extract claims from a source document and verify each against the target. You reconcile their findings and mitigate drift.

## Process

### Step 1: Identify source and target

Read:
- `../../docs/guides/interview-system.md`
- `references/interview-fields.md`

If called from `/build`, receive source and target from the build context.

If called standalone:
- infer the default source from `.pipeline/plan.md` when it exists
- infer the default target as the current working directory
- ask only if source or target is still genuinely missing or if the user explicitly asks for a custom comparison

Use a single-select prompt for default vs custom source/target resolution, with a
free-form option for custom paths. If structured prompts are unavailable, use the
same logic in plain text. Do not use `all of the above`.

Before dispatching the verifiers, emit the shared `[Requirements]` block covering source, target, focus, and assumptions.

### Step 2: Dispatch parallel verifiers

Issue both calls simultaneously in the same response turn — Agent 1 via the `drift-verifier` agent, Agent 2 via the `path-verifier` agent:

**Agent 1 — Sonnet Semantic Verifier**

Invoke the `drift-verifier` agent with this prompt:
```
Source of truth: [source document path]
Target: [target path or current working directory]
```

**Agent 2 — Sonnet Structural Verifier**

Invoke the `path-verifier` agent with this prompt:
```
Source of truth: [source document path]
Target: [target path or current working directory]
```

The two agents are complementary: `drift-verifier` extracts and evaluates semantic claims (EXISTS/MISSING/PARTIAL/CONTRADICTED); `path-verifier` mechanically checks that every mentioned file path and symbol name physically exists (EXISTS/MISSING only).

### Step 3: Reconcile findings

Once both agents return their results:

1. **Merge claim lists:** combine all claims both agents identified.
2. **Resolve conflicts:** where agents disagree on a claim's status, check the file/symbol directly to determine ground truth.
3. **Produce drift report:**

```markdown
# Drift Report

**Source:** [source path]
**Target:** [target]
**Date:** [YYYY-MM-DD]

## Summary
- Total claims: [N]
- Satisfied: [N]
- Missing: [N]
- Partial: [N]
- Contradicted: [N]

## Findings

| ID | Claim | Status | Evidence |
|----|-------|--------|---------|

## Recommended Actions
[Specific remediations for MISSING, PARTIAL, CONTRADICTED findings]
```

### Step 4: Mitigate if called from /build

If /drift-check is running as part of the /build post-build check:
- MISSING or CONTRADICTED findings → build does NOT complete; report to lead, lead unblocks or flags for re-build
- PARTIAL findings → lead judgment call: acceptable or must fix

If /drift-check is running standalone:
- Present report to user for judgment.
