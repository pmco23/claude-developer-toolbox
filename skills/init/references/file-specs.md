# File Generation Specs

For each file not skipped in Step 2, generate content appropriate for the detected project. Apply these constraints:

---

## README.md

- Sections: project name, description, installation (language-appropriate command), usage, contributing, license
- Installation command must match detected language (npm install / go get / pip install / dotnet restore / [INSTALL_COMMAND])
- Use `[PLACEHOLDER]` for any field that cannot be detected from project context — never invent values

## CHANGELOG.md

- Must follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format exactly
- Must follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- Include `## [Unreleased]` section and an initial `## [0.1.0] - [today]` entry with `### Added\n- Initial release`

## CONTRIBUTING.md

- Branching: [Conventional Branch](https://conventional-branch.github.io/) — `<type>/<short-description>`, types: feat/feature/fix/bugfix/hotfix/chore/release
- Commits: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) — `<type>[scope]: <description>`
- PR process: branch from main, PR against main, fill PR template, request review
- Development setup: adapt to detected language/stack, or use `[SETUP_STEPS]` placeholder

## .github/pull_request_template.md

- Sections: Description, Type of Change (checklist), Testing (checklist), Verification Evidence, Checklist (branch name, commit format, CHANGELOG, docs)
- Type of Change checkboxes: Bug fix, New feature, Breaking change, Documentation, Refactor, Chore
- Testing checkboxes: Tests added/updated, All tests pass, Manual testing

## .gitignore

- If creating new: include `.pipeline/` (pipeline artifacts are session-specific and must not be version-controlled) plus any language-appropriate entries (e.g., `node_modules/`, `*.pyc`, `dist/`, `*.o`)
- If merging into existing: append `.pipeline/` only if not already present

---

## Completion Report

After all files are written, output:

```
Boilerplate generated:
  ✓ README.md
  ✓ CHANGELOG.md
  ✓ CONTRIBUTING.md
  ✓ .github/pull_request_template.md
  ✓ .gitignore  (.pipeline/ excluded from version control)
  [skipped: list any skipped files]

Placeholders to fill in: [list any [PLACEHOLDER] fields remaining]

Run /git-workflow before committing these files.

To start developing a new feature on this project, run /brief to crystallize requirements into a pipeline brief.
```
