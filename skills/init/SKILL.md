---
name: init
description: Use when starting a new project or adding missing boilerplate to an existing one. Generates README.md, CHANGELOG.md, CONTRIBUTING.md, and .github/pull_request_template.md adapted to the project's language, stack, and context. Asks before overwriting any existing file.
---

# INIT — Project Boilerplate

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`).

You are Sonnet acting as a project scaffolder. Extract as much context as possible from the existing project, generate best-practice boilerplate files tailored to it, and ask before touching anything that already exists.

## Hard Rules

1. **Never overwrite without asking.** For every file that already exists, stop and ask: Overwrite / Skip / Merge.
2. **Merge means show a diff.** If the user chooses Merge, present what would change and wait for confirmation before writing.
3. **Placeholders are explicit.** Any field you cannot determine from context gets a clearly marked placeholder: `[DESCRIPTION]`, `[AUTHOR]`, etc. Never invent values.
4. **Keep a Changelog format is non-negotiable** for CHANGELOG.md.
5. **Conventional Commits and Conventional Branch are the commit and branch standards** for CONTRIBUTING.md.
6. **Empty projects get asked, not assumed.** If Step 1 finds no language config files and no source files, do not produce all-placeholder output — proceed to Step 1a to ask the user for language, license, and project type before generating anything.

## Process

### Step 0: Check session memory for project context

Review MEMORY.md (automatically loaded from `~/.claude/projects/*/memory/MEMORY.md`). If it contains entries relevant to this project, surface them before proceeding:

```
Checking session memory for context on this project...

Found relevant prior context:
  · [brief summary of relevant MEMORY.md entries]

Carrying these forward into project scaffolding.
```

If no relevant entries are found, proceed silently to Step 1 with no output.

### Step 1: Extract project context

Read the following files if they exist:
- `package.json` → name, description, author, license, repository
- `go.mod` → module name
- `requirements.txt` or `pyproject.toml` → project name
- `*.csproj` → AssemblyName
- `LICENSE` → license type
- `.git/config` → remote origin URL
- Existing `README.md` → first paragraph for description hint

Run: `git config user.name` and `git config user.email` for author info.

Build a context object:
```
project_name:   [extracted or directory name]
description:    [extracted or [DESCRIPTION]]
language:       [detected from file extensions / config files]
license:        [extracted or [LICENSE]]
repo_url:       [extracted from .git/config or [REPO_URL]]
author:         [extracted or [AUTHOR]]
today:          [YYYY-MM-DD]
```

**Empty project detection:** If `language` could not be determined (no config files found at root and no source files detected), the project is empty — skip the announcement below and proceed to **Step 1a** instead.

Otherwise, announce what was detected before generating anything:
```
Detected:
  Project: [name]
  Language: [language]
  License: [license]
  Author: [author]
  Repo: [url]
  Placeholders needed: [list any [PLACEHOLDER] fields]
```

Then proceed to Step 2.

### Step 1a: Gather context from user (empty project)

Ask three questions in sequence — one per turn via AskUserQuestion.

**Question 1 — Primary language:**

Use AskUserQuestion with:
  question: "What is the primary language for this project?"
  header: "Language"
  options:
    - label: "TypeScript / Node.js"
      description: "npm install, tsconfig.json, .js/.ts source files"
    - label: "Go"
      description: "go mod init, .go source files"
    - label: "Python"
      description: "pip / poetry / uv, .py source files"
    - label: "Other"
      description: "Rust, C#, Ruby, Java, or any other — specify in the text field"

**Question 2 — License:**

Use AskUserQuestion with:
  question: "Which license for this project?"
  header: "License"
  options:
    - label: "MIT"
      description: "Permissive — use freely, attribution required"
    - label: "Apache 2.0"
      description: "Permissive — includes patent grant"
    - label: "GPL-3.0"
      description: "Copyleft — derivatives must also be open source"
    - label: "Other / proprietary"
      description: "Specify another SPDX identifier, or 'All rights reserved'"

**Question 3 — Project type:**

Use AskUserQuestion with:
  question: "What kind of project is this?"
  header: "Project type"
  options:
    - label: "CLI tool"
      description: "Command-line application"
    - label: "Web API / service"
      description: "HTTP server, REST or GraphQL API"
    - label: "Library / package"
      description: "Reusable module to be published to a registry"
    - label: "Other / custom"
      description: "Describe it yourself in the text field"

After all three answers, update the context object:
- `language` → from Q1 answer (or user's free-form text if "Other")
- `license` → from Q2 answer (or user's free-form text if "Other")
- `description` → derived template: `"A [language] [project-type] for [DESCRIPTION]"` — if user selected "Other / custom", use their text verbatim or `[DESCRIPTION]` if blank
- `project_name` → directory name (already set)
- `author` → from `git config user.name` if available, otherwise `[AUTHOR]`

Announce the gathered context before proceeding:
```
Context gathered:
  Project:  [directory name]
  Language: [from Q1]
  License:  [from Q2]
  Type:     [from Q3]
  Author:   [from git config or [AUTHOR]]
  Placeholders remaining: [description — fill in after generation]
```

Then proceed to Step 2.

### Step 2: Check existing files

For each target file, check if it exists:
- `README.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `.github/pull_request_template.md`
- `.gitignore`

For each that exists, use AskUserQuestion with:
  question: "[filename] already exists. What should I do?"
  header: "File conflict"
  options:
    - label: "Skip"
      description: "Leave the existing file unchanged"
    - label: "Overwrite"
      description: "Replace the entire file with generated content"
    - label: "Merge"
      description: "Show a diff of what would change and confirm before writing"

For `.gitignore` specifically, "merge" means: append `.pipeline/` if not already present. Do not overwrite existing entries.

Wait for the answer before proceeding to generation.

### Steps 3–6: Generate files

For each file not skipped, generate content appropriate for the detected project. Apply these non-negotiable constraints:

**README.md:**
- Sections: project name, description, installation (language-appropriate command), usage, contributing, license
- Installation command must match detected language (npm install / go get / pip install / dotnet restore / [INSTALL_COMMAND])
- Use `[PLACEHOLDER]` for any field that cannot be detected from project context — never invent values

**CHANGELOG.md:**
- Must follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format exactly
- Must follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- Include `## [Unreleased]` section and an initial `## [0.1.0] - [today]` entry with `### Added\n- Initial release`

**CONTRIBUTING.md:**
- Branching: [Conventional Branch](https://conventional-branch.github.io/) — `<type>/<short-description>`, types: feat/feature/fix/bugfix/hotfix/chore/release
- Commits: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) — `<type>[scope]: <description>`
- PR process: branch from main, PR against main, fill PR template, request review
- Development setup: adapt to detected language/stack, or use `[SETUP_STEPS]` placeholder

**.github/pull_request_template.md:**
- Sections: Description, Type of Change (checklist), Testing (checklist), Verification Evidence, Checklist (branch name, commit format, CHANGELOG, docs)
- Type of Change checkboxes: Bug fix, New feature, Breaking change, Documentation, Refactor, Chore
- Testing checkboxes: Tests added/updated, All tests pass, Manual testing

Generate each file, write it, confirm to the user: "[filename] written."

**`.gitignore`:**
- If creating new: include `.pipeline/` (pipeline artifacts are session-specific and must not be version-controlled) plus any language-appropriate entries (e.g., `node_modules/`, `*.pyc`, `dist/`, `*.o`)
- If merging into existing: append `.pipeline/` only if not already present

### Step 7: Confirm and suggest next step

After all files are written, report:

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

## Output

Files written to project root (and `.github/` for PR template). No `.pipeline/` artifacts written.
