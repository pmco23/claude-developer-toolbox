# `claude-sre-custom` Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a new `claude-sre-custom` Claude Code plugin that bundles SRE skills (grafana, incident, k8s, runbook, slo) and clean up the dev plugin by removing Grafana.

**Architecture:** New standalone repo at `~/claude-sre-custom` mirroring the structure of `claude-agents-custom` — `plugin.json` with bundled MCP servers, a SessionStart hook for dependency checking and episodic memory injection, and individual `skills/*/SKILL.md` files. The dev plugin (`claude-agents-custom`) loses `/grafana` and the Grafana MCP in a separate cleanup task.

**Tech Stack:** Bash (hook), JSON (plugin.json), Markdown (skills + docs), Git, `uvx mcp-grafana`, `npx @modelcontextprotocol/server-kubernetes`.

---

### Task 1: Bootstrap the repo

**Files:**
- Create: `~/claude-sre-custom/` (new repo)

**Step 1: Create directory structure**

```bash
mkdir -p ~/claude-sre-custom/.claude-plugin
mkdir -p ~/claude-sre-custom/hooks
mkdir -p ~/claude-sre-custom/skills/grafana
mkdir -p ~/claude-sre-custom/skills/incident
mkdir -p ~/claude-sre-custom/skills/k8s
mkdir -p ~/claude-sre-custom/skills/runbook
mkdir -p ~/claude-sre-custom/skills/slo
mkdir -p ~/claude-sre-custom/docs/skills
mkdir -p ~/claude-sre-custom/docs/guides
```

**Step 2: Initialize git**

```bash
cd ~/claude-sre-custom
git init
git branch -m main
```

**Step 3: Verify**

```bash
ls ~/claude-sre-custom/.claude-plugin ~/claude-sre-custom/hooks ~/claude-sre-custom/skills
```
Expected: directories exist, no errors.

**Step 4: Commit**

```bash
cd ~/claude-sre-custom
git add .
git commit -m "chore: initial repo scaffold"
```

---

### Task 2: Create `plugin.json`

**Files:**
- Create: `~/claude-sre-custom/.claude-plugin/plugin.json`

**Step 1: Write the file**

```json
{
  "name": "claude-sre-custom",
  "version": "1.0.0",
  "description": "SRE toolbox: observability, incident response, Kubernetes ops, runbook execution",
  "author": {
    "name": "pemcoliveira"
  },
  "keywords": ["sre", "observability", "incident-response", "kubernetes", "grafana"],
  "mcpServers": {
    "mcp-grafana": {
      "command": "uvx",
      "args": [
        "mcp-grafana",
        "--enabled-tools", "search,prometheus,loki,datasource,alerting,dashboard,asserts,sift,navigation,rendering,examples,searchlogs,runpanelquery"
      ],
      "env": {
        "GRAFANA_URL": "${GRAFANA_URL}",
        "GRAFANA_SERVICE_ACCOUNT_TOKEN": "${GRAFANA_SERVICE_ACCOUNT_TOKEN}"
      }
    },
    "mcp-kubernetes": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-kubernetes"]
    }
  }
}
```

**Step 2: Validate JSON**

```bash
jq . ~/claude-sre-custom/.claude-plugin/plugin.json
```
Expected: pretty-printed JSON, no errors.

**Step 3: Commit**

```bash
cd ~/claude-sre-custom
git add .claude-plugin/plugin.json
git commit -m "feat: add plugin.json with mcp-grafana and mcp-kubernetes"
```

---

### Task 3: Create `session_start_check.sh`

**Files:**
- Create: `~/claude-sre-custom/hooks/session_start_check.sh`

**Step 1: Write the file**

```bash
#!/usr/bin/env bash
# session_start_check.sh
# SessionStart hook: warns about missing tools this plugin depends on.
# Missing tools degrade (but do not break) the plugin — hooks fail open.

MISSING=()

command -v python3 >/dev/null 2>&1 || MISSING+=("python3 — required for MEMORY.md injection")
command -v uvx     >/dev/null 2>&1 || MISSING+=("uvx     — required to run mcp-grafana (install via: pip install uv or brew install uv)")
command -v npx     >/dev/null 2>&1 || MISSING+=("npx     — required to run mcp-kubernetes (install via: nodejs.org)")
command -v kubectl >/dev/null 2>&1 || MISSING+=("kubectl — required for Kubernetes MCP server context (install via: kubernetes.io/docs/tasks/tools)")
EPISODIC_CHECK=$(ls "$HOME/.claude/plugins/cache/superpowers-marketplace/episodic-memory/"*/cli/episodic-memory.js 2>/dev/null | sort -V | tail -1)
[ -n "$EPISODIC_CHECK" ] && [ -f "$EPISODIC_CHECK" ] || MISSING+=("episodic-memory plugin — required for session context injection (install via superpowers marketplace)")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "⚠ claude-sre-custom: missing tools detected:" >&2
  for item in "${MISSING[@]}"; do
    echo "    • $item" >&2
  done
  echo "  Install missing tools; see README for setup instructions." >&2
fi

# --- Episodic memory: sync last session and inject recent context into MEMORY.md ---

EPISODIC_BIN=$(ls "$HOME/.claude/plugins/cache/superpowers-marketplace/episodic-memory/"*/cli/episodic-memory.js 2>/dev/null | sort -V | tail -1)

if [ -z "$EPISODIC_BIN" ] || [ ! -f "$EPISODIC_BIN" ]; then
  echo "⚠ claude-sre-custom: episodic-memory not found — skipping session context injection" >&2
else
  node "$EPISODIC_BIN" sync >/dev/null 2>&1

  AFTER_DATE=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d 2>/dev/null)
  SEARCH_OUTPUT=$(node "$EPISODIC_BIN" search "recent work" --limit 3 --after "$AFTER_DATE" 2>/dev/null \
    | grep -v "^Loading\|^Embedding\|^   Lines\|^$" \
    | sed 's/ - [-0-9]*% match//')

  if [ -n "$SEARCH_OUTPUT" ]; then
    ENCODED=$(echo "$PWD" | sed 's|^/||; s|/|-|g')
    MEMORY_DIR="$HOME/.claude/projects/-${ENCODED}/memory"
    MEMORY_FILE="$MEMORY_DIR/MEMORY.md"

    mkdir -p "$MEMORY_DIR"

    TODAY=$(date +%Y-%m-%d)
    NEW_BLOCK="<!-- session-context-start -->
## Recent Activity (auto-updated at session start — ${TODAY})

${SEARCH_OUTPUT}
<!-- session-context-end -->"

    if [ -f "$MEMORY_FILE" ] && grep -q "<!-- session-context-start -->" "$MEMORY_FILE"; then
      python3 -c "
import sys, re
content = open('$MEMORY_FILE').read()
new_block = '''$NEW_BLOCK'''
result = re.sub(
  r'<!-- session-context-start -->.*?<!-- session-context-end -->',
  new_block,
  content,
  flags=re.DOTALL
)
open('$MEMORY_FILE', 'w').write(result)
"
    elif [ -f "$MEMORY_FILE" ]; then
      printf '\n%s\n' "$NEW_BLOCK" >> "$MEMORY_FILE"
    else
      printf '%s\n' "$NEW_BLOCK" > "$MEMORY_FILE"
    fi
  fi
fi

exit 0
```

**Step 2: Make executable and verify syntax**

```bash
chmod +x ~/claude-sre-custom/hooks/session_start_check.sh
bash -n ~/claude-sre-custom/hooks/session_start_check.sh && echo "syntax ok"
```
Expected: `syntax ok`

**Step 3: Commit**

```bash
cd ~/claude-sre-custom
git add hooks/session_start_check.sh
git commit -m "feat: add SessionStart hook with dependency checks and episodic memory injection"
```

---

### Task 4: Move `/grafana` skill

**Files:**
- Create: `~/claude-sre-custom/skills/grafana/SKILL.md` (copied from dev plugin)
- Create: `~/claude-sre-custom/docs/skills/grafana.md`

**Step 1: Copy the skill file**

```bash
cp ~/claude-agents-custom/skills/grafana/SKILL.md ~/claude-sre-custom/skills/grafana/SKILL.md
```

**Step 2: Create the skill doc**

```bash
cp ~/claude-agents-custom/docs/skills/grafana.md ~/claude-sre-custom/docs/skills/grafana.md
```

**Step 3: Verify**

```bash
head -5 ~/claude-sre-custom/skills/grafana/SKILL.md
```
Expected: frontmatter with `name: grafana`.

**Step 4: Commit**

```bash
cd ~/claude-sre-custom
git add skills/grafana/ docs/skills/grafana.md
git commit -m "feat: add /grafana skill (moved from dev plugin)"
```

---

### Task 5: Create `/incident` skill

**Files:**
- Create: `~/claude-sre-custom/skills/incident/SKILL.md`
- Create: `~/claude-sre-custom/docs/skills/incident.md`

**Step 1: Write `skills/incident/SKILL.md`**

```markdown
---
name: incident
description: Use during an active incident or alert investigation — correlates signals across Grafana metrics, Loki logs, and Kubernetes state to reconstruct a timeline, assess blast radius, and produce a structured incident summary. Accepts a free-text alert description or symptom.
---

# INCIDENT — SRE Incident Responder

## Role

> **Model:** Opus (`claude-opus-4-6`). Complex cross-signal correlation requires Opus reasoning.

You are an SRE incident responder. You receive a free-text description of an alert, symptom, or
page and work through it using Grafana and Kubernetes MCP tools, reasoning step-by-step until
you have a complete picture of the incident.

**Prerequisites:** `GRAFANA_URL` and `GRAFANA_SERVICE_ACCOUNT_TOKEN` must be exported. A valid
kubeconfig must be available. If any first tool call returns an auth error or connection refused,
stop and tell the user to verify credentials and restart Claude Code.

## Execution: ReAct Loop

For each step:

1. **Reason** — state in one sentence what signal you need next and which tool fits
2. **Act** — call the tool
3. **Observe** — read the result
4. **Decide** — is the picture complete? If yes, go to Output. If not, return to Reason.

**Investigation sequence (adapt as evidence accumulates):**

1. **Alerting** — `mcp__mcp-grafana__list_alert_rules` to see all firing alerts and their
   current state
2. **Metrics** — `mcp__mcp-grafana__query_prometheus` for relevant error rate / latency / saturation
3. **Logs** — `mcp__mcp-grafana__query_loki_logs` for error patterns around the incident window
4. **Error patterns** — `mcp__mcp-grafana__find_error_patterns_in_logs` for elevated error
   detection
5. **Kubernetes state** — check pod status, recent restarts, resource pressure for affected services
6. **Sift** — `mcp__mcp-grafana__list_sift_investigations` if a recent investigation exists for
   this service

**Tips:**
- Start with the time window: 30 minutes before the alert fired to now
- Use `mcp__mcp-grafana__list_datasources` first to get the Prometheus and Loki datasource UIDs
- Use `mcp__mcp-grafana__generate_deeplinks` for all dashboards you reference
- Use `mcp__mcp-grafana__get_panel_image` if a visual would clarify the incident shape

## Output

End with a structured incident summary:

```
## Incident Summary

**Reported symptom:** [what the user described]
**Time window:** [start] → [now]
**Severity assessment:** [P1/P2/P3 with reasoning]

### Timeline
- [HH:MM] [event]
- [HH:MM] [event]

### Root Cause Hypothesis
[1-2 sentences — what is likely causing this]

### Blast Radius
[What is affected, what is not]

### Current State
[Is it recovering? Stable? Worsening?]

### Recommended Next Steps
1. [Immediate action]
2. [Follow-up]

### Evidence
[Links to dashboards, panels, log queries used]
```
```

**Step 2: Write `docs/skills/incident.md`**

```markdown
# /incident — SRE Incident Responder

**Gate:** None (always available)
**Model:** Opus

Investigates an active incident or alert by correlating signals across Grafana metrics, Loki
logs, and Kubernetes state. Accepts a free-text alert description or symptom and produces a
structured incident summary with timeline, blast radius, root cause hypothesis, and recommended
next steps.

## Usage

```
/incident <alert or symptom description>
```

## Prerequisites

- `GRAFANA_URL` and `GRAFANA_SERVICE_ACCOUNT_TOKEN` exported in shell
- Valid kubeconfig for Kubernetes tools
- `mcp-grafana` and `mcp-kubernetes` MCP servers running (bundled in this plugin)

## Output

Structured incident summary: timeline, blast radius, root cause hypothesis, current state,
recommended next steps, and evidence links.
```
```

**Step 3: Verify frontmatter**

```bash
head -5 ~/claude-sre-custom/skills/incident/SKILL.md
```
Expected: `name: incident` in frontmatter.

**Step 4: Commit**

```bash
cd ~/claude-sre-custom
git add skills/incident/ docs/skills/incident.md
git commit -m "feat: add /incident skill — SRE incident responder"
```

---

### Task 6: Create `/k8s` skill

**Files:**
- Create: `~/claude-sre-custom/skills/k8s/SKILL.md`
- Create: `~/claude-sre-custom/docs/skills/k8s.md`

**Step 1: Write `skills/k8s/SKILL.md`**

```markdown
---
name: k8s
description: Use for any Kubernetes operations task — inspecting pods, deployments, services, checking logs, reviewing manifests, scaling, or restarting workloads. Accepts free-text tasks. Write operations (apply, delete, scale, restart) pause for explicit confirmation before executing.
---

# K8S — Kubernetes Operator

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`). If running on Haiku, output quality for judgment tasks
> will be reduced.

You are an SRE assistant with access to a Kubernetes cluster via MCP tools. You receive a
free-text task and work through it step-by-step using the available tools.

**Prerequisite:** A valid kubeconfig must be available (default: `~/.kube/config`). If the first
tool call returns an auth error, stop and tell the user to verify their kubeconfig.

## Safety Rule

**Before executing any write operation** (apply, delete, scale, restart, patch), stop and show
the user exactly what will happen:

```
About to [action] [resource] in namespace [ns].
[Show the manifest or command that will be applied]

Proceed? (yes/no)
```

Do not proceed until the user confirms.

## Execution: ReAct Loop

For each step:

1. **Reason** — state what you need to find out or do, and which tool fits
2. **Act** — call the tool
3. **Observe** — read the result
4. **Decide** — task complete? If yes, go to Output. If not, return to Reason.

**Common patterns:**

- Inspecting a workload → get deployment/pod → describe → logs if error
- Checking cluster health → list nodes → list pods (all namespaces) → look for non-Running pods
- Scaling → get current replicas → confirm → scale
- Troubleshooting a pod → describe pod (look at Events) → get logs → get logs --previous if CrashLoopBackOff

> **Note:** The exact MCP tool names depend on the `mcp-kubernetes` server version installed.
> Run `mcp__mcp-kubernetes__list_tools` (if available) at the start of a session to discover
> available tools. Common tools follow kubectl semantics: get, describe, logs, apply, delete,
> scale, rollout.

## Output

End with a structured summary:

```
## Result

[1-3 sentence summary of what was found or done]

### Details
[Findings or changes — use tables for multi-resource output]

### Next Steps
[If action was taken, what to watch; if investigating, what to do next]
```
```

**Step 2: Write `docs/skills/k8s.md`**

```markdown
# /k8s — Kubernetes Operator

**Gate:** None (always available)
**Model:** Sonnet

Kubernetes operations toolbox — inspect pods, deployments, services, check logs, review
manifests, scale, or restart workloads. Free-text task input. Write operations (apply, delete,
scale, restart) pause for explicit user confirmation before executing.

## Usage

```
/k8s <task description>
```

## Prerequisites

- Valid kubeconfig (`~/.kube/config` or `KUBECONFIG` env var)
- `mcp-kubernetes` MCP server running (bundled in this plugin via `npx`)

## Safety

All write operations show exactly what will happen and require explicit confirmation before
proceeding. Read-only operations (get, describe, logs) execute without confirmation.
```
```

**Step 3: Verify**

```bash
head -5 ~/claude-sre-custom/skills/k8s/SKILL.md
```
Expected: `name: k8s` in frontmatter.

**Step 4: Commit**

```bash
cd ~/claude-sre-custom
git add skills/k8s/ docs/skills/k8s.md
git commit -m "feat: add /k8s skill — Kubernetes operator"
```

---

### Task 7: Create `/runbook` skill

**Files:**
- Create: `~/claude-sre-custom/skills/runbook/SKILL.md`
- Create: `~/claude-sre-custom/docs/skills/runbook.md`

**Step 1: Write `skills/runbook/SKILL.md`**

```markdown
---
name: runbook
description: Use to execute a runbook step-by-step. Reads a local markdown runbook file and guides execution one step at a time, pausing for confirmation at destructive or irreversible steps. Invoke as /runbook path/to/runbook.md.
---

# RUNBOOK — Runbook Executor

## Role

> **Model:** Sonnet (`claude-sonnet-4-6`). If running on Haiku, judgment for step classification
> will be reduced.

You are an SRE assistant that executes runbooks. You read a local markdown runbook file and
guide the user through it one step at a time, executing tool calls where appropriate and pausing
for confirmation at dangerous steps.

## Invocation

```
/runbook path/to/runbook.md
```

Read the file at the given path immediately. If it does not exist, stop and tell the user.

## Execution Rules

**Read the entire runbook first.** Before starting execution, output a brief summary:

```
Runbook: [title]
Steps: [N total]
Destructive steps: [list step numbers that are irreversible — delete, restart, drain, failover, etc.]

Ready to begin. Type 'go' to start.
```

Wait for the user to type `go` before starting.

**For each step:**

1. Display the step header and description
2. If the step involves a command or tool call, execute it (or show output if dry-run)
3. If the step is destructive or irreversible: **pause and ask for confirmation before proceeding**
4. Show the result
5. Ask: "Step complete. Continue to Step N+1? (yes / skip / abort)"

**Destructive step markers** — treat as requiring confirmation if the step contains any of:
delete, drain, cordon, failover, cutover, drop, truncate, terminate, destroy, evict, disable,
remove (when applied to running services or data)

**If a step fails:**

Stop immediately. Do not proceed to the next step. Report:

```
Step N failed: [error]

Options:
1. Retry this step
2. Skip this step (mark as skipped, continue)
3. Abort runbook
```

Wait for the user to choose.

## Output

After all steps complete (or runbook is aborted), output:

```
## Runbook Execution Summary

**Runbook:** [title]
**Outcome:** [Completed / Aborted at Step N]

| Step | Status |
|------|--------|
| 1. [name] | ✓ done |
| 2. [name] | ✓ done |
| 3. [name] | ⚠ skipped |

[Any notes on failures or skips]
```
```

**Step 2: Write `docs/skills/runbook.md`**

```markdown
# /runbook — Runbook Executor

**Gate:** None (always available)
**Model:** Sonnet

Executes a local markdown runbook step-by-step. Reads the file, summarizes the steps and
flags destructive ones, then walks through each step with confirmation at dangerous operations.
Stops on failure and offers retry/skip/abort options.

## Usage

```
/runbook path/to/runbook.md
```

## Runbook Format

Any markdown file with numbered or headed steps. No special format required — the skill reads
natural language runbooks.

## Safety

Steps containing delete, drain, failover, cutover, terminate, drop, truncate, or similar
destructive keywords require explicit confirmation before execution.
```
```

**Step 3: Verify**

```bash
head -5 ~/claude-sre-custom/skills/runbook/SKILL.md
```
Expected: `name: runbook` in frontmatter.

**Step 4: Commit**

```bash
cd ~/claude-sre-custom
git add skills/runbook/ docs/skills/runbook.md
git commit -m "feat: add /runbook skill — step-by-step runbook executor"
```

---

### Task 8: Create `/slo` skill

**Files:**
- Create: `~/claude-sre-custom/skills/slo/SKILL.md`
- Create: `~/claude-sre-custom/docs/skills/slo.md`

**Step 1: Write `skills/slo/SKILL.md`**

```markdown
---
name: slo
description: Use to check SLO status and error budget for a service — queries Prometheus via Grafana for current error rate, computes remaining error budget, and surfaces active SLO-related alert rules. Accepts a service name and optional time window.
---

# SLO — Error Budget Calculator

## Role

> **Model:** Haiku (`claude-haiku-4-5-20251001`). This is a mechanical calculation skill —
> PromQL queries and arithmetic. Haiku is sufficient.

You are an SRE assistant that checks SLO status. You query Prometheus via the Grafana MCP and
compute error budget burn rate.

**Prerequisites:** `GRAFANA_URL` and `GRAFANA_SERVICE_ACCOUNT_TOKEN` must be exported. If the
first tool call returns an auth error, stop and tell the user.

## Invocation

```
/slo <service-name> [window: 7d|30d]
```

Default window: 30d.

## Execution

**Step 1: Discover datasource**

Call `mcp__mcp-grafana__list_datasources` and find the Prometheus datasource UID.

**Step 2: Get error rate**

Query Prometheus for error rate over the window. Adapt the metric names to what exists:

```
# Try common patterns:
sum(rate(http_requests_total{job="<service>", status=~"5.."}[5m]))
  / sum(rate(http_requests_total{job="<service>"}[5m]))

# Or for gRPC:
sum(rate(grpc_server_handled_total{job="<service>", grpc_code!="OK"}[5m]))
  / sum(rate(grpc_server_handled_total{job="<service>"}[5m]))
```

Use `mcp__mcp-grafana__list_prometheus_metric_names` if the service name doesn't match — search
for `<service>` in the metric list to find the right job label.

**Step 3: Compute error budget**

Given:
- SLO target (ask the user if not provided — default: 99.9%)
- Error budget = 1 - SLO target
- Allowed errors over window = error budget × total requests over window
- Current burn rate = current error rate / error budget

**Step 4: Check alerts**

Call `mcp__mcp-grafana__list_alert_rules` and filter for rules mentioning the service name.

## Output

```
## SLO Report: <service> (<window>)

**SLO target:** <X>%
**Current error rate:** <X>%
**Error budget remaining:** <X>% (<N> minutes/hours/days of budget left)
**Burn rate:** <X>x (1.0x = consuming budget at exactly the sustainable rate)

### Status
[Green: budget healthy / Yellow: elevated burn / Red: budget exhausted or near exhaustion]

### Active SLO Alerts
[List any firing alert rules for this service, or "None"]

### PromQL used
[Show the queries for reproducibility]
```
```

**Step 2: Write `docs/skills/slo.md`**

```markdown
# /slo — Error Budget Calculator

**Gate:** None (always available)
**Model:** Haiku

Checks SLO status and error budget for a service. Queries Prometheus via the Grafana MCP for
current error rate, computes remaining error budget and burn rate, and lists active SLO-related
alert rules.

## Usage

```
/slo <service-name> [window: 7d|30d]
```

Default window: 30d. SLO target defaults to 99.9% if not specified — ask to override.

## Prerequisites

- `GRAFANA_URL` and `GRAFANA_SERVICE_ACCOUNT_TOKEN` exported in shell
- `mcp-grafana` MCP server running (bundled in this plugin)
```
```

**Step 3: Verify**

```bash
head -5 ~/claude-sre-custom/skills/slo/SKILL.md
```
Expected: `name: slo` in frontmatter.

**Step 4: Commit**

```bash
cd ~/claude-sre-custom
git add skills/slo/ docs/skills/slo.md
git commit -m "feat: add /slo skill — error budget calculator"
```

---

### Task 9: Create `README.md` and `CHANGELOG.md`

**Files:**
- Create: `~/claude-sre-custom/README.md`
- Create: `~/claude-sre-custom/CHANGELOG.md`

**Step 1: Write `README.md`**

```markdown
# claude-sre-custom

An SRE toolbox for Claude Code. Standalone skills for observability, incident response,
Kubernetes ops, and runbook execution. No enforced pipeline — invoke whatever you need.

## Skills

| Skill | Description |
|-------|-------------|
| `/grafana <task>` | Grafana toolbox — dashboards, metrics (Prometheus), logs (Loki), alerts, Sift investigations |
| `/incident <symptom>` | Incident investigation — correlates Grafana + Kubernetes signals, produces structured incident summary |
| `/k8s <task>` | Kubernetes ops — inspect, describe, logs, scale, restart (write ops require confirmation) |
| `/runbook <path>` | Runbook executor — step-by-step, pauses at destructive steps |
| `/slo <service> [window]` | SLO and error budget check — error rate, burn rate, remaining budget |

## Prerequisites

### Required

| Tool | Purpose | Install |
|------|---------|---------|
| Claude Code | Runtime | [docs.claude.ai](https://docs.claude.ai) |
| uv / uvx | Run mcp-grafana | `pip install uv` or `brew install uv` |
| Node.js / npx | Run mcp-kubernetes | [nodejs.org](https://nodejs.org) |

### Environment Variables

| Variable | Required by | Description |
|----------|------------|-------------|
| `GRAFANA_URL` | `/grafana`, `/slo`, `/incident` | Grafana instance URL (e.g. `http://localhost:3000`) |
| `GRAFANA_SERVICE_ACCOUNT_TOKEN` | `/grafana`, `/slo`, `/incident` | Grafana service account token |
| `KUBECONFIG` | `/k8s`, `/incident` | Path to kubeconfig (default: `~/.kube/config`) |

Export these in your shell profile before starting Claude Code.

### Optional

| Tool | Purpose |
|------|---------|
| `episodic-memory` plugin | Session context injection at startup — install via superpowers marketplace |
| `kubectl` | Required by the Kubernetes MCP server for cluster access |

## Install

```bash
claude
/plugin marketplace add ~/claude-sre-custom
```

## MCP Servers

Both MCP servers are bundled — no manual `claude mcp add` needed.

| Server | Command | Used by |
|--------|---------|---------|
| `mcp-grafana` | `uvx mcp-grafana` | `/grafana`, `/slo`, `/incident` |
| `mcp-kubernetes` | `npx @modelcontextprotocol/server-kubernetes` | `/k8s`, `/incident` |
```

**Step 2: Write `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-02

### Added

- `/grafana` skill — SRE toolbox for Grafana (dashboards, Prometheus, Loki, alerts, Sift),
  moved from `claude-agents-custom`
- `/incident` skill — SRE incident responder, correlates Grafana + Kubernetes signals
- `/k8s` skill — Kubernetes operator with confirmation gate on write operations
- `/runbook` skill — step-by-step runbook executor with destructive-step confirmation
- `/slo` skill — error budget calculator via Prometheus/Grafana MCP
- SessionStart hook — dependency checks and episodic memory injection
- Bundled MCP servers: `mcp-grafana` (uvx) and `mcp-kubernetes` (npx)
```

**Step 3: Verify both files exist**

```bash
head -3 ~/claude-sre-custom/README.md && head -3 ~/claude-sre-custom/CHANGELOG.md
```

**Step 4: Commit**

```bash
cd ~/claude-sre-custom
git add README.md CHANGELOG.md
git commit -m "docs: add README and CHANGELOG for v1.0.0"
```

---

### Task 10: Migrate — clean up `claude-agents-custom`

**Files (in `~/claude-agents-custom`):**
- Delete: `skills/grafana/SKILL.md`
- Delete: `docs/skills/grafana.md`
- Modify: `.claude-plugin/plugin.json` — remove `mcp-grafana`
- Modify: `hooks/session_start_check.sh` — remove `uvx` check
- Modify: `README.md` — remove `/grafana` from pipeline diagram and prerequisites
- Modify: `CHANGELOG.md` — document removal

**Step 1: Remove grafana skill and doc**

```bash
cd ~/claude-agents-custom
rm skills/grafana/SKILL.md
rmdir skills/grafana
rm docs/skills/grafana.md
```

**Step 2: Remove mcp-grafana from plugin.json**

Edit `.claude-plugin/plugin.json` and remove the entire `"mcp-grafana"` block from `mcpServers`.
Result should be:

```json
{
  "name": "claude-agents-custom",
  "version": "1.6.0",
  "description": "Quality-gated development pipeline: brief → design → review → plan → build → qa",
  "author": {
    "name": "pemcoliveira"
  },
  "keywords": ["pipeline", "quality-gates", "tdd", "adversarial-review"],
  "mcpServers": {
    "codex": {
      "command": "codex",
      "args": ["mcp-server"]
    },
    "repomix": {
      "command": "repomix",
      "args": ["--mcp"]
    }
  }
}
```

Validate: `jq . .claude-plugin/plugin.json` — no errors.

**Step 3: Remove `uvx` check from hook**

In `hooks/session_start_check.sh`, remove this line:

```bash
command -v uvx     >/dev/null 2>&1 || MISSING+=("uvx     — required to run mcp-grafana (install via: pip install uv or brew install uv)")
```

Verify syntax: `bash -n hooks/session_start_check.sh && echo "syntax ok"`

**Step 4: Update README.md**

In `README.md`:
- Remove the `/grafana <task>` line from the pipeline diagram
- Remove the Grafana MCP row from the Optional prerequisites table

**Step 5: Update CHANGELOG.md**

Bump version to `1.6.0` and add under `## [Unreleased]` → new `## [1.6.0] - 2026-03-02`:

```markdown
## [1.6.0] - 2026-03-02

### Removed

- `/grafana` skill and `mcp-grafana` MCP server — moved to `claude-sre-custom` plugin
```

**Step 6: Commit**

```bash
cd ~/claude-agents-custom
git add .claude-plugin/plugin.json hooks/session_start_check.sh skills/ docs/skills/grafana.md README.md CHANGELOG.md
git commit -m "feat!: remove /grafana and mcp-grafana — moved to claude-sre-custom"
```

**Step 7: Push**

```bash
git push origin main
```
