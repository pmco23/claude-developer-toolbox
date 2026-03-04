# Frontend Audit Checklists

## Diagnostics Tier Announcement

**IDE Diagnostics (try first):** Call `mcp__ide__getDiagnostics` (no URI) — if results, use as authoritative source.

**Announce quality tier before proceeding:**
- If `mcp__ide__getDiagnostics` returned results: output `🟢 IDE diagnostics active — errors and warnings are authoritative (VS Code integration).`
- Else if `typescript_lsp` is available: output `🟢 TypeScript LSP active — type errors and unused-variable diagnostics are authoritative.`
- Else: output `🟡 No IDE or TypeScript LSP detected — findings are heuristic. Install typescript-lsp for authoritative results (see README Language Support Matrix).`

## TypeScript LSP Checks

If `typescript_lsp` tool is available:
- Get all type errors and warnings
- Get all unused variable diagnostics
- Use type information to flag patterns that defeat the type system (any casts, @ts-ignore without justification)

## General Frontend Checks

Check:
- Naming conventions (components PascalCase, hooks usePrefix, etc.)
- Import organization (external before internal, grouped)
- Component size (flag components over 200 lines as candidates for extraction)
- Props patterns (no inline object literals in JSX if project avoids them)
- CSS/styling conventions (CSS modules vs. Tailwind vs. styled-components — match what's already used)
- **Accessibility (basic):**
  - Interactive elements (buttons, inputs, links) have accessible labels (`aria-label`, `alt` text, `<label for>`)
  - Images have non-empty `alt` attributes (or `aria-hidden="true"` for decorative ones)
  - Heading hierarchy is sequential (h1 → h2 → h3 — no skipped levels)
  - Focus is not permanently trapped or removed (`tabIndex="-1"` without focus management is a signal)
- Console.log statements left in production code
- TODO/FIXME comments that reference completed work
