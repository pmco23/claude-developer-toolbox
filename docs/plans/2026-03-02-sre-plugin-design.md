# Design: `claude-sre-custom` — SRE Toolbox Plugin

**Date:** 2026-03-02

## Problem

The dev pipeline plugin (`claude-agents-custom`) contains `/grafana` and the Grafana MCP server,
which are SRE concerns that don't belong in a dev workflow plugin. With more SRE skills planned
(incident response, Kubernetes ops, runbook execution, SLO management), the scope justifies a
dedicated plugin with its own identity.

## Decision

Split into two plugins:

- **`claude-agents-custom`** — stays as the quality-gated dev pipeline (removes Grafana)
- **`claude-sre-custom`** — new SRE toolbox: standalone skills, no enforced pipeline sequence

## Identity

An SRE toolbox for Claude Code. Standalone skills for observability, incident response, Kubernetes
ops, and runbook execution. Invoke whatever you need, whenever you need it — no pipeline, no
quality gates.

## Skills

| Skill | Model | Description |
|-------|-------|-------------|
| `/grafana` | Sonnet | Moved from dev plugin. Dashboards, Prometheus/Loki, alerts, Sift. |
| `/incident` | Opus | Alert triage, timeline reconstruction, blast radius — ReAct loop across Grafana + k8s signals |
| `/k8s` | Sonnet | Cluster inspection, pod/deployment status, log tailing, manifest review |
| `/runbook` | Sonnet | Step-by-step guided remediation from a local markdown runbook |
| `/slo` | Haiku | SLO and error budget — current burn rate, remaining budget, alerting rules |

## Repository Structure

```
claude-sre-custom/
├── .claude-plugin/
│   └── plugin.json              # MCP servers + hook registration
├── hooks/
│   └── session_start_check.sh   # dependency warnings (uvx, node, kubectl, etc.)
├── skills/
│   ├── grafana/SKILL.md         # moved from claude-agents-custom
│   ├── incident/SKILL.md
│   ├── k8s/SKILL.md
│   ├── runbook/SKILL.md
│   └── slo/SKILL.md
├── docs/
│   ├── skills/                  # one .md per skill (human-readable docs)
│   └── guides/                  # installation, MCP setup, troubleshooting
├── README.md
└── CHANGELOG.md
```

## MCP Servers

| Server | Command | Skills |
|--------|---------|--------|
| `mcp-grafana` | `uvx mcp-grafana` | `/grafana`, `/slo`, `/incident` |
| `mcp-kubernetes` | `npx mcp-kubernetes` (community server) | `/k8s`, `/incident` |

Both bundled in `plugin.json`, credentials from environment variables
(`GRAFANA_URL`, `GRAFANA_SERVICE_ACCOUNT_TOKEN`, `KUBECONFIG`).

## Skill Design Notes

### `/incident`

ReAct loop (same pattern as `/grafana`) — receives a free-text alert or symptom description,
reasons step-by-step using Grafana and Kubernetes MCP tools to reconstruct timeline, assess blast
radius, and produce a structured incident summary. Uses Opus for complex cross-signal correlation.

### `/runbook`

Invoked as `/runbook path/to/runbook.md`. Reads the file, executes steps one at a time, pausing
for user confirmation at destructive steps. URL support deferred to a future iteration.

### `/slo`

Mechanical skill (Haiku) — queries Prometheus via the Grafana MCP for error rate and burn rate,
computes remaining error budget, and surfaces any active SLO-related alert rules.

### `/k8s`

Sonnet using the Kubernetes MCP. Free-text task input, capability catalogue + ReAct loop (same
pattern as `/grafana`). Covers read operations (inspect, describe, logs) and write operations
(restart, scale, apply manifest) — write operations require explicit user confirmation.

## Session Persistence

Same episodic memory pattern as `claude-agents-custom`: SessionStart hook syncs and injects
recent cross-project context into `MEMORY.md`.

## Migration: Changes to `claude-agents-custom`

| File | Change |
|------|--------|
| `skills/grafana/SKILL.md` | Delete |
| `.claude-plugin/plugin.json` | Remove `mcp-grafana` entry |
| `hooks/session_start_check.sh` | Remove `uvx` dependency check |
| `docs/skills/grafana.md` | Delete |
| `README.md` | Remove `/grafana` from pipeline diagram and prerequisites |
| `CHANGELOG.md` | Document removal |
