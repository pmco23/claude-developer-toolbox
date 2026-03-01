# /grafana — Grafana SRE Toolbox

**Gate:** None (always available — requires Grafana MCP)
**Writes:** nothing
**Model:** inherits from calling context

Accepts a free-text observability task and works through it using a ReAct loop (Reason → Act → Observe → Decide). Knows its full tool catalogue upfront: dashboards, Prometheus/Loki querying, alerting, Sift investigations, log search, deeplink generation, and panel rendering. Handles both single-step queries and multi-hop investigations.

Requires `GRAFANA_URL` and `GRAFANA_SERVICE_ACCOUNT_TOKEN` to be exported in the shell environment. See the [Grafana MCP setup guide](../guides/mcp-setup.md#grafana-mcp).

## Usage

```
/grafana what alerts are currently firing?
/grafana show me the p99 latency for service checkout over the last hour
/grafana find dashboards related to postgres and render the connections panel
/grafana search for error patterns in logs for the auth service
```
