# Empty Project Interview Field Bank

Use this file with the shared pattern in `../../docs/guides/interview-system.md`.

Goal: resolve only the empty-project fields that are still missing after the
context scan. Ask one question at a time and stop once the scaffolding context
is good enough to generate useful boilerplate.

Field types:

- primary language — mutually exclusive → single-select with an "Other" free-form escape hatch
- license — mutually exclusive → single-select with an "Other / proprietary" free-form escape hatch
- project type — mutually exclusive → single-select with an "Other / custom" free-form escape hatch

Do not use `multiSelect: true` in this field bank. Do not use `all of the above`.

Prioritization:

1. Primary language — highest impact because it drives README, CLAUDE.md, and conventions
2. Project type — next, because it shapes boilerplate examples and workflow language
3. License — last, unless the user explicitly asked for legal defaults up front

If the user says "not sure" or "just proceed", record a visible assumption:

- language: keep the detected value if one exists, otherwise `[LANGUAGE]`
- project type: keep `[PROJECT_TYPE]`
- license: keep `[LICENSE]`

## Field 1 — Primary language

Prefer AskUserQuestion with:
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

If structured prompts are unavailable in this runtime, ask the same question in plain text and include the options inline.

## Field 2 — License

Prefer AskUserQuestion with:
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

If structured prompts are unavailable in this runtime, ask the same question in plain text and include the options inline.

## Field 3 — Project type

Prefer AskUserQuestion with:
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

If structured prompts are unavailable in this runtime, ask the same question in plain text and include the options inline.

## Handoff

After the adaptive loop, update the context object from the resolved answers and assumptions:
- `language` → from the primary language answer (or the user's free-form text if "Other")
- `license` → from the license answer (or the user's free-form text if "Other / proprietary")
- `description` → `"A [language] [project-type] for [DESCRIPTION]"` — if project type is "Other / custom", use their text or `[DESCRIPTION]` if blank
- `project_name` → directory name (already set)
- `author` → from `git config user.name` if available, otherwise `[AUTHOR]`

Emit the shared `[Requirements]` block before proceeding to Step 2, then announce:
```
Context gathered:
  Project:  [directory name]
  Language: [resolved language]
  License:  [resolved license]
  Type:     [resolved project type]
  Author:   [from git config or [AUTHOR]]
  Placeholders remaining: [description — fill in after generation]
```
