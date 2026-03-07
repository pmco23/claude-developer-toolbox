#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const LOG_DIR = ".claude";
const LOG_FILE = "session-log.md";
const NOTICE_FILE = ".session-log-gitignore-notice";
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

    process.stdout.write(`${HEADER}\n${entries.join("\n\n").trim()}\n`);
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

function maybePrintGitignoreNotice(projectDir, claudeDir) {
  const gitignorePath = path.join(projectDir, ".gitignore");
  const noticePath = path.join(claudeDir, NOTICE_FILE);

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
  fs.writeFileSync(noticePath, new Date().toISOString(), "utf8");
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
