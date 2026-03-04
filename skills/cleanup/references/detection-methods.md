# Dead Code Detection Methods

## Diagnostics Tier

**IDE Diagnostics (try first):** Call `mcp__ide__getDiagnostics` (no URI) — if results, use as authoritative source.

**Announce quality tier before proceeding:**
- If `mcp__ide__getDiagnostics` returned results: output `🟢 IDE diagnostics active — errors and warnings are authoritative (VS Code integration).`
- Else if LSP is available: output `🟢 LSP active — dead code findings are authoritative.`
- Else: output `🟡 No IDE or LSP diagnostics available — findings are heuristic (grep-pattern). Install the language LSP for authoritative results (see README Language Support Matrix).`

## LSP-Based Detection

If LSP is available for the project language:
- Request all unused symbol diagnostics
- Request all unreachable code diagnostics
- List unused imports via LSP

## Static Analysis Fallback

If LSP is not available:
- Search for symbols defined but never referenced (grep patterns)
- Look for commented-out code blocks (// TODO: remove, /* dead */, etc.)
- Find imports with no usages in the file
- Identify functions/methods with no callers (search for their name across codebase)

## QA Overlap Note

If running as part of `/qa --parallel`, `/backend-audit` also checks unused imports for Go and TypeScript. Overlapping findings on that category are expected — both reports are correct.
