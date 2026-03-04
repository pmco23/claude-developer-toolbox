# Build Procedures

## Partial Build Detection (Step 0)

Before reading the plan or dispatching any agents, check whether this is a fresh build or a resume.

First, call TaskList. If tasks from a prior build are present (status: in_progress or completed), use that as the authoritative source of which groups have already run. File-based detection is a secondary cross-check only.

Then scan the working directory for files that would be created by task groups in the plan (if `.pipeline/plan.md` already exists, read it to find the "Files: Create" entries for each group).

If tasks or files from a previous partial build are detected, use AskUserQuestion with:
  question: "Partial build detected. Groups [list] appear already complete. How to proceed?"
  header: "Resume build"
  options:
    - label: "Resume"
      description: "Skip completed groups, dispatch only remaining ones"
    - label: "Restart"
      description: "Delete .pipeline/build.complete and re-run all groups from scratch"

- If "Restart": delete `.pipeline/build.complete` if present and proceed with all groups active.
- If "Resume": mark completed groups as done, dispatch only remaining groups.
- If no prior tasks or files found: proceed normally.

## Task Creation (Step 1)

After extracting all task groups from `.pipeline/plan.md`, call TaskList. Only call TaskCreate for groups that do NOT already have a corresponding task (match by subject prefix "Task Group [N]"). For groups that already have tasks, use those existing task IDs going forward.

If this is a fresh build (no existing tasks): call TaskCreate for each group:
- subject: "Task Group [N] — [Name]"
- description: "[from the task group's Context for agent section]"
- activeForm: "Building Task Group [N] — [Name]"

This creates a persistent task list that survives context compaction.

## Post-Build Drift Verification (Steps 3–4)

After all task groups complete, run drift detection:

Invoke the `drift-verifier` agent with:
  Source: `.pipeline/plan.md`
  Target: current working directory

Wait for the agent's structured claim list (claim_id, claim, status, evidence).

### Evaluating drift results

If the drift-verifier finds MISSING or CONTRADICTED claims:
- Identify which task group is responsible
- Re-invoke the `task-builder` agent for that group with specific remediation instructions
- Re-run the drift-verifier agent after remediation

After 2 consecutive drift-verifier failures on the same claim, stop retrying. Escalate to the user: present the failing claims, the agent's last output, and ask how to proceed before making any further attempts.

### Writing build.complete

When the drift-verifier passes with no unresolved MISSING or CONTRADICTED findings:

```bash
mkdir -p .pipeline
touch .pipeline/build.complete
```

Confirm: "Build complete and verified. Run `/qa` for post-build audits."
