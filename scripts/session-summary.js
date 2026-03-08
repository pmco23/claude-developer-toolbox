#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const LOG_DIR = ".claude";
const LOG_FILE = "session-log.md";
const MAX_LOG_BYTES = 50 * 1024;
const MAX_GOAL_CHARS = 100;
const MAX_FILE_CHANGES = 5;
const MAX_DECISIONS = 3;
const MAX_OPEN_THREADS = 3;

main();

async function main() {
  try {
    const stdinText = await readStdinText();
    const payload = parseJson(stdinText);
    const projectDir = resolveProjectDir(payload);
    const claudeDir = ensureClaudeDir(projectDir);

    maybePrintGitignoreNotice(projectDir, claudeDir);

    const summary = await buildSummary(payload, projectDir, stdinText);
    if (!summary) {
      process.exit(0);
      return;
    }

    const logPath = path.join(claudeDir, LOG_FILE);
    appendEntry(logPath, summary);
    trimLogFile(logPath, MAX_LOG_BYTES);
  } catch (error) {
    safeStderr(`[session-summary] ${error.message}`);
  }

  process.exit(0);
}

async function buildSummary(payload, projectDir, stdinText) {
  const transcriptData = await analyzeTranscript(payload, projectDir, stdinText);
  if (!hasMeaningfulSignal(transcriptData)) {
    return null;
  }
  const snapshotState = readRepomixState(
    projectDir,
    transcriptData.lastTimestamp || new Date().toISOString()
  );

  const isoDate = toIsoString(
    transcriptData.lastTimestamp || new Date().toISOString()
  );
  const duration = formatDuration(transcriptData.durationMs);
  const goal = limitChars(
    transcriptData.goal || "No user goal captured.",
    MAX_GOAL_CHARS
  );
  const outcome = determineOutcome(payload, transcriptData);
  const keyChanges = formatKeyChanges(transcriptData.keyChanges);
  const decisions = formatBullets(
    transcriptData.decisions,
    MAX_DECISIONS,
    "No explicit decisions captured."
  );
  const openThreads = formatOpenThreads(transcriptData.openThreads, outcome);
  const snapshotLine = formatSnapshotState(snapshotState);

  const lines = [
    `## Session: ${isoDate} | ${duration}`,
    "",
    `**Goal:** ${goal}`,
    `**Outcome:** ${outcome}`,
    "**Key changes:**",
    ...keyChanges,
    "**Decisions made:**",
    ...decisions,
    "**Open threads:**",
    ...openThreads,
  ];

  if (snapshotLine) {
    lines.push(`**Snapshot state:** ${snapshotLine}`);
  }

  lines.push("", "---", "");
  return lines.join("\n");
}

function hasMeaningfulSignal(transcriptData) {
  return Boolean(
    transcriptData.goal ||
      transcriptData.assistantMessages > 0 ||
      transcriptData.keyChanges.size > 0 ||
      transcriptData.decisions.length > 0 ||
      transcriptData.openThreads.length > 0
  );
}

async function analyzeTranscript(payload, projectDir, stdinText) {
  const transcriptPath = expandHome(
    stringOrEmpty(payload.transcript_path || payload.transcriptPath)
  );
  if (transcriptPath && fs.existsSync(transcriptPath)) {
    return analyzeTranscriptFile(transcriptPath, projectDir);
  }

  const inlineLines = extractInlineTranscriptLines(payload, stdinText);
  if (inlineLines.length > 0) {
    return analyzeTranscriptLines(inlineLines, projectDir);
  }

  return createEmptyTranscriptSummary();
}

function createEmptyTranscriptSummary() {
  const summary = {
    goal: "",
    firstTimestamp: "",
    lastTimestamp: "",
    durationMs: 0,
    keyChanges: new Map(),
    decisions: [],
    openThreads: [],
    assistantMessages: 0,
    meaningfulEvents: 0,
    lastAssistantText: "",
  };

  return summary;
}

async function analyzeTranscriptFile(transcriptPath, projectDir) {
  const summary = createEmptyTranscriptSummary();

  const rl = readline.createInterface({
    input: fs.createReadStream(transcriptPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    applyTranscriptLine(line, projectDir, summary);
  }

  return finalizeTranscriptSummary(summary);
}

function analyzeTranscriptLines(lines, projectDir) {
  const summary = createEmptyTranscriptSummary();
  for (const line of lines) {
    applyTranscriptLine(line, projectDir, summary);
  }
  return finalizeTranscriptSummary(summary);
}

function applyTranscriptLine(line, projectDir, summary) {
  if (!stringOrEmpty(line).trim()) {
    return;
  }

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }

  if (event.timestamp) {
    if (!summary.firstTimestamp) {
      summary.firstTimestamp = event.timestamp;
    }
    summary.lastTimestamp = event.timestamp;
  }

  if (event.type === "user" && !event.isMeta && !summary.goal) {
    const userText = extractUserText(event.message && event.message.content);
    if (userText) {
      summary.goal = userText;
    }
  }

  if (event.type === "assistant") {
    const assistantText = extractAssistantText(
      event.message && event.message.content
    );

    if (assistantText) {
      summary.assistantMessages += 1;
      summary.meaningfulEvents += 1;
      summary.lastAssistantText = assistantText;
      collectDecisions(assistantText, summary.decisions);
    }

    collectFileChanges(
      event.message && event.message.content,
      projectDir,
      summary.keyChanges
    );
  }
}

function finalizeTranscriptSummary(summary) {
  summary.durationMs = computeDurationMs(
    summary.firstTimestamp,
    summary.lastTimestamp
  );
  summary.openThreads = extractOpenThreads(summary.lastAssistantText);
  return summary;
}

function extractInlineTranscriptLines(payload, stdinText) {
  if (Array.isArray(payload.transcript)) {
    return payload.transcript
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        try {
          return JSON.stringify(item);
        } catch {
          return "";
        }
      })
      .filter((line) => line.trim());
  }

  const transcriptText = stringOrEmpty(payload.transcript);
  if (transcriptText.trim()) {
    return transcriptText.split(/\r?\n/).filter((line) => line.trim());
  }

  if (!looksLikeTranscriptJsonl(stdinText)) {
    return [];
  }

  return stdinText.split(/\r?\n/).filter((line) => line.trim());
}

function looksLikeTranscriptJsonl(text) {
  const lines = stringOrEmpty(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return false;
  }

  let matchedEvents = 0;
  for (const line of lines.slice(0, 5)) {
    try {
      const event = JSON.parse(line);
      if (
        event &&
        typeof event === "object" &&
        (event.type === "user" || event.type === "assistant")
      ) {
        matchedEvents += 1;
      }
    } catch {
      return false;
    }
  }

  return matchedEvents > 0;
}

function collectFileChanges(content, projectDir, keyChanges) {
  if (!Array.isArray(content)) {
    return;
  }

  for (const item of content) {
    if (!item || item.type !== "tool_use") {
      continue;
    }

    const toolName = stringOrEmpty(item.name);
    if (!isTrackedChangeTool(toolName)) {
      continue;
    }

    const filePath = extractFilePath(item.input);
    if (!filePath) {
      continue;
    }

    const normalizedPath = normalizePathForDisplay(filePath, projectDir);
    if (!normalizedPath) {
      continue;
    }

    const action = mapToolToAction(toolName);
    if (!keyChanges.has(normalizedPath)) {
      keyChanges.set(normalizedPath, new Set());
    }
    keyChanges.get(normalizedPath).add(action);
  }
}

function collectDecisions(text, decisions) {
  const sentences = splitSentences(text);
  const decisionPattern =
    /\b(?:i['’]ll go with|let['’]s use|the approach is|i decided to|we should)\b/i;

  for (const sentence of sentences) {
    if (!decisionPattern.test(sentence)) {
      continue;
    }

    const normalized = sentence.toLowerCase();
    if (decisions.some((existing) => existing.toLowerCase() === normalized)) {
      continue;
    }

    decisions.push(limitChars(sentence, 140));
    if (decisions.length >= MAX_DECISIONS) {
      break;
    }
  }
}

function extractOpenThreads(text) {
  if (!text) {
    return [];
  }

  const lines = text
    .split(/\r?\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const pattern =
    /\b(?:TODO|next step|remaining|still need to|follow up|pending|left to)\b/i;
  const matches = [];

  for (const line of lines) {
    if (!pattern.test(line)) {
      continue;
    }

    matches.push(limitChars(line, 140));
    if (matches.length >= MAX_OPEN_THREADS) {
      break;
    }
  }

  return matches;
}

function determineOutcome(payload, transcriptData) {
  const reason = stringOrEmpty(payload.reason || payload.stop_reason).toLowerCase();

  if (/(error|crash|abort|interrupt|failed)/.test(reason)) {
    return "abandoned";
  }

  const noSignal =
    transcriptData.assistantMessages === 0 &&
    transcriptData.keyChanges.size === 0 &&
    transcriptData.decisions.length === 0;

  if (noSignal || transcriptData.durationMs < 60 * 1000) {
    return "partial";
  }

  return "completed";
}

function formatKeyChanges(keyChanges) {
  const items = Array.from(keyChanges.entries()).slice(0, MAX_FILE_CHANGES);
  if (items.length === 0) {
    return ["- No file changes captured."];
  }

  return items.map(([filePath, actions]) => {
    const detail = Array.from(actions).join(", ");
    return `- ${filePath}: ${detail}`;
  });
}

function formatBullets(items, maxItems, fallback) {
  const trimmed = items.slice(0, maxItems);
  if (trimmed.length === 0) {
    return [`- ${fallback}`];
  }
  return trimmed.map((item) => `- ${item}`);
}

function formatOpenThreads(items, outcome) {
  if (items.length > 0) {
    return items.slice(0, MAX_OPEN_THREADS).map((item) => `- ${item}`);
  }

  if (outcome === "partial" || outcome === "abandoned") {
    return ["- Session ended before a clear next step was recorded."];
  }

  return ["- No open threads recorded."];
}

function formatSnapshotState(snapshotState) {
  if (!snapshotState) {
    return "";
  }

  const parts = [];
  if (snapshotState.availableVariants.length > 0) {
    parts.push(`available: ${snapshotState.availableVariants.join("/")}`);
  }
  if (snapshotState.packedAt) {
    parts.push(`packedAt: ${snapshotState.packedAt}`);
  }
  if (snapshotState.ageLabel) {
    parts.push(`age: ${snapshotState.ageLabel}`);
  }

  return parts.join("; ");
}

function appendEntry(logPath, entry) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const existingEntries = fs.existsSync(logPath)
    ? parseEntries(fs.readFileSync(logPath, "utf8"))
    : [];
  const lastEntry = existingEntries[existingEntries.length - 1];
  if (lastEntry && lastEntry.trim() === entry.trim()) {
    return;
  }
  fs.appendFileSync(logPath, entry, "utf8");
}

function trimLogFile(logPath, maxBytes) {
  if (!fs.existsSync(logPath)) {
    return;
  }

  let content = fs.readFileSync(logPath, "utf8");
  if (Buffer.byteLength(content, "utf8") <= maxBytes) {
    return;
  }

  const entries = parseEntries(content);
  const kept = [];

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    kept.unshift(entries[i]);
    const joined = kept.join("\n");
    if (Buffer.byteLength(joined, "utf8") > maxBytes) {
      kept.shift();
      break;
    }
  }

  const nextContent = `${kept.join("\n").trim()}\n`;
  fs.writeFileSync(logPath, nextContent, "utf8");
}

function parseEntries(content) {
  const parts = content.split(/^## Session:\s*/m).filter(Boolean);
  if (parts.length === 0) {
    return [];
  }
  return parts
    .map((entry) => `## Session: ${entry}`.trim())
    .filter(Boolean);
}

function readRepomixState(projectDir, referenceTimestamp) {
  const packPath = path.join(projectDir, ".pipeline", "repomix-pack.json");
  if (!fs.existsSync(packPath)) {
    return null;
  }

  let packData;
  try {
    packData = JSON.parse(fs.readFileSync(packPath, "utf8"));
  } catch {
    return null;
  }

  const snapshots =
    packData && typeof packData.snapshots === "object" && packData.snapshots
      ? packData.snapshots
      : {};

  const availableVariants = ["code", "docs", "full"].filter((variant) => {
    const snapshot = snapshots[variant];
    return snapshot && typeof snapshot.filePath === "string" && snapshot.filePath;
  });

  const packedAt = stringOrEmpty(packData.packedAt);
  return {
    availableVariants,
    packedAt,
    ageLabel: formatAgeLabel(packedAt, referenceTimestamp),
  };
}

function maybePrintGitignoreNotice(projectDir, claudeDir) {
  const gitignorePath = path.join(projectDir, ".gitignore");
  const noticePath = getNoticePath(projectDir, claudeDir);

  if (!fs.existsSync(gitignorePath) || fs.existsSync(noticePath)) {
    return;
  }

  const gitignore = fs.readFileSync(gitignorePath, "utf8");
  if (gitignore.includes(".claude/session-log.md")) {
    return;
  }

  safeStderr(
    "Note: add .claude/session-log.md to .gitignore if you want project-local session memory kept out of git."
  );
  fs.mkdirSync(path.dirname(noticePath), { recursive: true });
  fs.writeFileSync(noticePath, new Date().toISOString(), "utf8");
}

function getNoticePath(projectDir, fallbackDir) {
  try {
    const home = os.homedir();
    if (home) {
      const key = crypto.createHash("sha1").update(projectDir).digest("hex");
      return path.join(home, ".claude", "session-log-notices", `${key}.notice`);
    }
  } catch {
    // fall through
  }

  return path.join(fallbackDir, ".session-log-gitignore-notice");
}

function resolveProjectDir(payload) {
  const candidate =
    process.env.CLAUDE_PROJECT_DIR ||
    (payload.workspace && payload.workspace.project_dir) ||
    payload.cwd ||
    process.cwd();

  return path.resolve(expandHome(stringOrEmpty(candidate)) || process.cwd());
}

function ensureClaudeDir(projectDir) {
  const claudeDir = path.join(projectDir, LOG_DIR);
  fs.mkdirSync(claudeDir, { recursive: true });
  return claudeDir;
}

function extractUserText(content) {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    const commandMessage = extractTaggedContent(content, "command-message");
    const candidate = commandMessage || content;
    return limitChars(cleanText(candidate), MAX_GOAL_CHARS);
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const textParts = [];
  for (const item of content) {
    if (!item) {
      continue;
    }
    if (item.type === "text" && item.text) {
      textParts.push(item.text);
    }
  }

  return limitChars(cleanText(textParts.join(" ")), MAX_GOAL_CHARS);
}

function extractAssistantText(content) {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return cleanText(content);
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const textParts = [];
  for (const item of content) {
    if (!item) {
      continue;
    }
    if (item.type === "text" && item.text) {
      textParts.push(item.text);
    }
  }

  return cleanText(textParts.join("\n"));
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => cleanText(sentence))
    .filter(Boolean);
}

function extractTaggedContent(text, tagName) {
  const match = text.match(
    new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i")
  );
  return match ? cleanText(match[1]) : "";
}

function cleanText(value) {
  return stringOrEmpty(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTrackedChangeTool(toolName) {
  return [
    "write_file",
    "edit_file",
    "str_replace",
    "Write",
    "Edit",
    "MultiEdit",
  ].includes(toolName);
}

function extractFilePath(input) {
  if (!input || typeof input !== "object") {
    return "";
  }

  return (
    stringOrEmpty(input.file_path) ||
    stringOrEmpty(input.path) ||
    stringOrEmpty(input.target_file) ||
    stringOrEmpty(input.filePath)
  );
}

function mapToolToAction(toolName) {
  if (toolName === "write_file" || toolName === "Write") {
    return "written";
  }
  if (toolName === "str_replace") {
    return "updated via string replacement";
  }
  return "edited";
}

function normalizePathForDisplay(filePath, projectDir) {
  const expanded = expandHome(filePath);
  const absolute = path.isAbsolute(expanded)
    ? path.normalize(expanded)
    : path.normalize(path.join(projectDir, expanded));

  const relative = path.relative(projectDir, absolute);
  if (!relative || relative.startsWith("..")) {
    return filePath;
  }

  return relative;
}

function computeDurationMs(firstTimestamp, lastTimestamp) {
  const first = Date.parse(firstTimestamp || "");
  const last = Date.parse(lastTimestamp || "");
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) {
    return 0;
  }
  return last - first;
}

function formatAgeLabel(timestamp, referenceTimestamp) {
  const packedAtMs = Date.parse(timestamp || "");
  if (!Number.isFinite(packedAtMs)) {
    return "";
  }

  const referenceMs = referenceTimestamp
    ? Date.parse(referenceTimestamp)
    : Date.now();
  const ageMs = referenceMs - packedAtMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "";
  }

  const totalMinutes = Math.round(ageMs / 60000);
  if (totalMinutes < 1) {
    return "under 1m";
  }
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatDuration(durationMs) {
  if (!durationMs || durationMs < 60 * 1000) {
    return "under 1m";
  }

  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function toIsoString(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function limitChars(value, maxChars) {
  const text = cleanText(value);
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function parseJson(text) {
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}

function expandHome(targetPath) {
  if (!targetPath) {
    return "";
  }
  if (targetPath === "~") {
    return process.env.HOME || targetPath;
  }
  if (targetPath.startsWith("~/")) {
    return path.join(process.env.HOME || "", targetPath.slice(2));
  }
  return targetPath;
}

function safeStderr(message) {
  try {
    process.stderr.write(`${message}\n`);
  } catch {
    // ignore
  }
}

function readStdinText() {
  return new Promise((resolve) => {
    const lines = [];
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => lines.push(line));
    rl.on("close", () => resolve(lines.join("\n")));
    rl.on("error", () => resolve(""));
  });
}
