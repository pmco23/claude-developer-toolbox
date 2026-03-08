#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

main();

function main() {
  const argv = process.argv.slice(2);
  let options = { base: "", json: argv.includes("--json") };

  try {
    options = parseArgs(argv);
    const repoRoot = runGit(["rev-parse", "--show-toplevel"], process.cwd()).stdout.trim();
    const branchName = currentBranch(repoRoot);
    const baseRef = options.base || detectBaseRef(repoRoot);

    if (!baseRef) {
      fail(
        "PR QA BLOCKED — could not determine a base ref. Re-run with `--base <ref>`.",
        2,
        options,
        "base_ref_required"
      );
      return;
    }

    const baseCommit = resolveBaseCommit(repoRoot, baseRef);
    const files = collectChangedFiles(repoRoot, baseCommit);
    const summary = summarizeFiles(files);
    const payload = {
      status: files.length > 0 ? "ok" : "empty",
      repoRoot,
      branchName,
      baseRef,
      baseCommit,
      reviewScope: "diff",
      hasLocalChanges: files.some((entry) => entry.sources.includes("staged") || entry.sources.includes("unstaged") || entry.sources.includes("untracked")),
      changedFiles: files,
      summary,
    };

    emit(payload, options);
  } catch (error) {
    const exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
    const errorCode = typeof error.code === "string" ? error.code : "unknown_error";
    fail(`PR QA BLOCKED — ${error.message}`, exitCode, options, errorCode);
  }
}

function parseArgs(argv) {
  const options = {
    base: "",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base") {
      options.base = argv[++i] || "";
    } else if (arg === "--json") {
      options.json = true;
    } else {
      throw createError("invalid_args", `Unknown argument: ${arg}`, 2);
    }
  }

  return options;
}

function currentBranch(repoRoot) {
  const result = runGit(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot, true);
  return result.ok ? result.stdout.trim() : "HEAD";
}

function detectBaseRef(repoRoot) {
  const upstream = runGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    repoRoot,
    true
  );
  if (upstream.ok && upstream.stdout.trim()) {
    return upstream.stdout.trim();
  }

  const originHead = runGit(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], repoRoot, true);
  if (originHead.ok && originHead.stdout.trim()) {
    return originHead.stdout.trim().replace(/^refs\/remotes\//, "");
  }

  for (const candidate of ["origin/main", "origin/master", "main", "master"]) {
    if (verifyRef(repoRoot, candidate)) {
      return candidate;
    }
  }

  return "";
}

function resolveBaseCommit(repoRoot, baseRef) {
  const mergeBase = runGit(["merge-base", "HEAD", baseRef], repoRoot, true);
  if (mergeBase.ok && mergeBase.stdout.trim()) {
    return mergeBase.stdout.trim();
  }

  const direct = runGit(["rev-parse", "--verify", `${baseRef}^{commit}`], repoRoot, true);
  if (direct.ok && direct.stdout.trim()) {
    return direct.stdout.trim();
  }

  throw createError("base_ref_not_found", `base ref not found: ${baseRef}`, 3);
}

function verifyRef(repoRoot, ref) {
  return runGit(["rev-parse", "--verify", `${ref}^{commit}`], repoRoot, true).ok;
}

function collectChangedFiles(repoRoot, baseCommit) {
  const entries = new Map();

  addNameStatus(entries, runGit(["diff", "--name-status", "-z", `${baseCommit}...HEAD`], repoRoot).stdout, "branch");
  addNameStatus(entries, runGit(["diff", "--cached", "--name-status", "-z"], repoRoot).stdout, "staged");
  addNameStatus(entries, runGit(["diff", "--name-status", "-z"], repoRoot).stdout, "unstaged");
  addUntracked(entries, runGit(["ls-files", "--others", "--exclude-standard", "-z"], repoRoot).stdout);

  return Array.from(entries.values())
    .map((entry) => ({
      path: entry.path,
      kind: classifyPath(entry.path),
      gitStatuses: Array.from(entry.gitStatuses).sort(),
      sources: Array.from(entry.sources).sort(),
      oldPath: entry.oldPath || undefined,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function addNameStatus(entries, output, source) {
  if (!output) {
    return;
  }

  const tokens = output.split("\0").filter(Boolean);
  for (let index = 0; index < tokens.length; ) {
    const statusToken = tokens[index++];
    const code = statusToken.charAt(0);

    if (code === "R" || code === "C") {
      const oldPath = tokens[index++];
      const newPath = tokens[index++];
      if (newPath) {
        const entry = ensureEntry(entries, newPath);
        entry.oldPath = oldPath;
        entry.gitStatuses.add(code === "R" ? "renamed" : "copied");
        entry.sources.add(source);
      }
      continue;
    }

    const filePath = tokens[index++];
    if (!filePath) {
      continue;
    }

    const entry = ensureEntry(entries, filePath);
    entry.gitStatuses.add(mapStatusCode(code));
    entry.sources.add(source);
  }
}

function addUntracked(entries, output) {
  if (!output) {
    return;
  }

  for (const filePath of output.split("\0").filter(Boolean)) {
    const entry = ensureEntry(entries, filePath);
    entry.gitStatuses.add("untracked");
    entry.sources.add("untracked");
  }
}

function ensureEntry(entries, filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  if (!entries.has(normalizedPath)) {
    entries.set(normalizedPath, {
      path: normalizedPath,
      gitStatuses: new Set(),
      sources: new Set(),
    });
  }
  return entries.get(normalizedPath);
}

function summarizeFiles(files) {
  const summary = {
    totalFiles: files.length,
    codeFiles: 0,
    testFiles: 0,
    docsFiles: 0,
    otherFiles: 0,
    docsOnly: false,
    hasTestsChanged: false,
    hasCodeChanges: false,
    hasDocsChanges: false,
  };

  for (const file of files) {
    if (file.kind === "code") {
      summary.codeFiles += 1;
      summary.hasCodeChanges = true;
    } else if (file.kind === "test") {
      summary.testFiles += 1;
      summary.hasTestsChanged = true;
    } else if (file.kind === "docs") {
      summary.docsFiles += 1;
      summary.hasDocsChanges = true;
    } else {
      summary.otherFiles += 1;
    }
  }

  summary.docsOnly =
    summary.totalFiles > 0 &&
    summary.docsFiles === summary.totalFiles;

  return summary;
}

function classifyPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const baseName = path.basename(lower);

  if (
    /(^|\/)(test|tests|__tests__)(\/|$)/.test(lower) ||
    /\.(test|spec)\.[a-z0-9]+$/.test(lower) ||
    /_test\.go$/.test(lower)
  ) {
    return "test";
  }

  if (
    /(^|\/)(docs?|guides?)(\/|$)/.test(lower) ||
    /\.(md|mdx|rst|txt)$/.test(lower) ||
    /^(readme|changelog|contributing|license)/.test(baseName)
  ) {
    return "docs";
  }

  if (
    /\.(js|jsx|ts|tsx|mjs|cjs|py|go|rs|java|kt|cs|rb|php|swift|scala|sh|bash|zsh|sql|json|ya?ml|toml)$/.test(lower)
  ) {
    return "code";
  }

  return "other";
}

function mapStatusCode(code) {
  switch (code) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "M":
      return "modified";
    case "T":
      return "type-changed";
    case "U":
      return "unmerged";
    default:
      return code || "modified";
  }
}

function emit(payload, options) {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  const lines = [
    `PR QA diff scope: ${payload.branchName} vs ${payload.baseRef} (${payload.baseCommit.slice(0, 12)})`,
    `Changed files: ${payload.summary.totalFiles}`,
    `  code: ${payload.summary.codeFiles}`,
    `  tests: ${payload.summary.testFiles}`,
    `  docs: ${payload.summary.docsFiles}`,
    `  other: ${payload.summary.otherFiles}`,
  ];

  if (payload.changedFiles.length > 0) {
    lines.push("");
    lines.push("Files:");
    for (const entry of payload.changedFiles) {
      lines.push(`- ${entry.path} [${entry.kind}] (${entry.gitStatuses.join(", ")})`);
    }
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function fail(message, code, options, errorCode = "unknown_error") {
  if (options && options.json) {
    process.stdout.write(
      `${JSON.stringify({ status: "error", code: errorCode, message }, null, 2)}\n`
    );
  } else {
    process.stderr.write(`${message}\n`);
  }
  process.exit(code);
}

function runGit(args, cwd, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!result.error && result.status === 0) {
    return { ok: true, stdout: result.stdout || "", stderr: result.stderr || "" };
  }

  if (allowFailure) {
    return {
      ok: false,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      error: result.error,
      status: result.status,
    };
  }

  if (result.error && result.error.code === "ENOENT") {
    throw createError("git_not_installed", "git is not installed", 127);
  }

  const message = (result.stderr || result.stdout || `git exited ${result.status}`).trim();
  if (/not a git repository/i.test(message)) {
    throw createError("not_git_repo", message, 4);
  }

  throw createError("git_failed", message, result.status || 1);
}

function createError(code, message, exitCode) {
  const error = new Error(message);
  error.code = code;
  error.exitCode = exitCode;
  return error;
}
