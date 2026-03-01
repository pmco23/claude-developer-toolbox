# /plugin-architecture — Plugin Architecture Guide

**Gate:** None (always available)
**Writes:** nothing
**Model:** inherits from calling context

Decision guide for when to use skills vs agents in Claude Code plugin development. Covers the fitness criterion (self-contained + read-only + verbose output), the thin wrapper and split patterns, agent frontmatter format, composition rules, and anti-patterns. Run when designing a new plugin component or evaluating whether an existing skill should become an agent.

## Usage

```
/plugin-architecture
```
