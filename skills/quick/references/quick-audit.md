# Quick Audit Procedure

Run lightweight checks on touched files only — not the full QA pipeline:

## LSP diagnostics (if available)

- Request diagnostics for each modified file
- Report all errors and warnings found — note that pre-existing issues unrelated to this change may also appear

## Security spot-check (changed code only)

- Hardcoded secrets, API keys, or credentials introduced
- Unsanitized user input flowing into a sensitive sink (SQL, shell, file path) in changed lines
- If clean: "No obvious security issues in changed code."

## Test file check

- For each modified file, check if a corresponding test file exists (same name with .test.ts, _test.go, test_.py, etc.)
- If yes: "Test file exists at [path] — run it to confirm no regressions."
- If no: no comment.
