#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const LOG_DIR = ".claude";
const LOG_FILE = "session-log.md";
const MAX_ENTRIES = 3;
const HEADER =
  "## Recent Session History (auto-generated)\n" +
  "The following summarizes your recent work on this project:\n";

main();

async function main() {
  try {
    const stdinText = await readStdinText();
    const payload = parseJson(stdinText);
    const projectDir = resolveProjectDir(payload);
    const claudeDir = ensureClaudeDir(projectDir);

    maybePrintGitignoreNotice(projectDir, claudeDir);

    const logPath = path.join(claudeDir, LOG_FILE);
    if (!fs.existsSync(logPath)) {
      process.exit(0);
      return;
    }

    const content = fs.readFileSync(logPath, "utf8");
    const entries = parseEntries(content).slice(-MAX_ENTRIES);
    if (entries.length === 0) {
      process.exit(0);
      return;
    }
    const snapshotState = readRepomixState(projectDir);
    const snapshotLine = formatSnapshotState(snapshotState);

    const output = [HEADER.trimEnd()];
    if (snapshotLine) {
      output.push(`Current Repomix snapshot state: ${snapshotLine}`);
    }
    output.push("", entries.join("\n\n").trim());
    process.stdout.write(`${output.join("\n")}\n`);
  } catch (error) {
    safeStderr(`[session-context] ${error.message}`);
  }

  process.exit(0);
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

function readRepomixState(projectDir) {
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
    ageLabel: formatAgeLabel(packedAt),
  };
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

function formatAgeLabel(timestamp) {
  const packedAtMs = Date.parse(timestamp || "");
  if (!Number.isFinite(packedAtMs)) {
    return "";
  }

  const ageMs = Date.now() - packedAtMs;
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
