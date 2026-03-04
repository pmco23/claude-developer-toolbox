# Backend Audit Checklists

## Diagnostics Tier Announcement

**IDE Diagnostics (try first):** Call `mcp__ide__getDiagnostics` (no URI) — if results, use as authoritative source.

**Announce quality tier before proceeding.** Check which tools are available for the detected language:
- If `mcp__ide__getDiagnostics` returned results: output `🟢 IDE diagnostics active — errors and warnings are authoritative (VS Code integration).`
- Else if Go + `go_lsp`: output `🟢 Go LSP active — unused import and diagnostic findings are authoritative.`
- Else if Python + `python_lsp`: output `🟢 Python LSP active — unused import findings are authoritative.`
- Else if TypeScript + `typescript_lsp`: output `🟢 TypeScript LSP active — type error findings are authoritative.`
- Else if C# + `csharp_lsp`: output `🟢 C# LSP active — nullable and unused-using findings are authoritative.`
- Else if Rust + `rust_lsp`: output `🟢 Rust LSP active — unused variable and dead code findings are authoritative.`
- Else: output `🟡 No IDE or LSP diagnostics available for [language] — findings are heuristic. Install the language LSP for authoritative results (see README Language Support Matrix).`

## Language-Specific LSP Checks

**Go (if go_lsp available):**
- Unused variables and imports
- Error return values ignored (check for `_ = err`)
- Function signature conventions

**Python (if python_lsp available):**
- Unused imports and variables
- Type annotation consistency (if project uses mypy/pyright)
- Missing `__init__.py` where expected

**TypeScript backend (if typescript_lsp available):**
- Type errors and `any` usage
- Unused imports

**C# (if csharp_lsp available):**
- Unused usings
- Nullable reference warnings
- Naming violations (PascalCase methods, camelCase locals)

## General Backend Checks

Check regardless of language:
- Error handling — are errors surfaced or swallowed?
- Logging — are log statements using the project's logger (not raw print/console)?
- Constants vs. magic numbers — flag unexplained literals
- Package/module naming — match project convention
- Public API surface — is anything public that should be internal?
- Dead endpoints — routes registered but never called from tests or documented
