#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const VARIANTS = [
  {
    name: "code",
    output: "repomix-code.xml",
    args: [
      "--compress",
      "--remove-empty-lines",
      "--no-file-summary",
      "--include-diffs",
      "--ignore",
      "**/*.md,**/*.mdx,**/*.rst,**/*.txt,docs/**,doc/**,*.config.*,*.json,*.yaml,*.yml,*.toml,*.lock,*.svg,*.png,*.jpg,*.gif,*.ico",
    ],
  },
  {
    name: "docs",
    output: "repomix-docs.xml",
    args: [
      "--remove-empty-lines",
      "--no-file-summary",
      "--no-directory-structure",
      "--include",
      "**/*.md,**/*.mdx,**/*.rst,**/*.txt,docs/**,doc/**,README*,CHANGELOG*,CONTRIBUTING*,LICENSE*",
    ],
  },
  {
    name: "full",
    output: "repomix-full.xml",
    args: ["--compress", "--remove-empty-lines"],
  },
];

main();

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const repomixBin = process.env.REPOMIX_BIN || "repomix";
    const sourceDir = path.resolve(options.source);
    const pipelineDir = path.resolve(options.pipelineDir);

    if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
      fail(`PACK BLOCKED — source directory not found: ${sourceDir}`, 3, options);
      return;
    }

    if (!hasCommand(repomixBin)) {
      fail(
        "PACK BLOCKED — repomix is not installed. Run `npm install -g repomix` first.",
        2,
        options
      );
      return;
    }

    fs.mkdirSync(pipelineDir, { recursive: true });

    const snapshots = {};
    const failures = [];
    for (const variant of VARIANTS) {
      const outputPath = path.join(pipelineDir, variant.output);
      const result = runRepomix(repomixBin, variant, sourceDir, outputPath, options);
      if (result.ok) {
        snapshots[variant.name] = {
          filePath: outputPath,
          fileSize: safeFileSize(outputPath),
        };
      } else {
        failures.push({ variant: variant.name, reason: result.reason });
      }
    }

    const availableVariants = Object.keys(snapshots);
    if (availableVariants.length === 0) {
      fail("PACK FAILED — Repomix did not generate any snapshot.", 4, options, failures);
      return;
    }

    const manifest = {
      packedAt: new Date().toISOString(),
      source: sourceDir,
      snapshots,
    };
    const manifestPath = path.join(pipelineDir, "repomix-pack.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    emitSuccess(
      {
        status: "ok",
        source: sourceDir,
        pipelineDir,
        manifestPath,
        snapshots,
        failures,
      },
      options
    );
  } catch (error) {
    fail(`PACK FAILED — ${error.message}`, 5, { json: false, quiet: false });
  }
}

function parseArgs(argv) {
  const options = {
    source: process.cwd(),
    pipelineDir: path.join(process.cwd(), ".pipeline"),
    timeoutSec: 60,
    json: false,
    quiet: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source") {
      options.source = argv[++i];
    } else if (arg === "--pipeline-dir") {
      options.pipelineDir = argv[++i];
    } else if (arg === "--timeout-sec") {
      options.timeoutSec = Number.parseInt(argv[++i], 10) || 60;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--quiet") {
      options.quiet = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function hasCommand(commandName) {
  const probe = spawnSync(commandName, ["--version"], {
    stdio: "ignore",
    shell: false,
  });
  if (probe.error && probe.error.code === "ENOENT") {
    return false;
  }
  return true;
}

function runRepomix(repomixBin, variant, sourceDir, outputPath, options) {
  try {
    fs.rmSync(outputPath, { force: true });
  } catch {
    // ignore
  }

  const result = spawnSync(
    repomixBin,
    [...variant.args, "--output", outputPath, sourceDir],
    {
      encoding: "utf8",
      timeout: Math.max(options.timeoutSec, 1) * 1000,
      stdio: ["ignore", "ignore", "pipe"],
    }
  );

  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      return { ok: false, reason: `timed out after ${options.timeoutSec}s` };
    }
    if (result.error.code === "ENOENT") {
      return { ok: false, reason: "repomix not found" };
    }
    return { ok: false, reason: result.error.message };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      reason: stringOrEmpty(result.stderr).trim() || `exit ${result.status}`,
    };
  }

  if (!fs.existsSync(outputPath)) {
    return { ok: false, reason: "output file missing" };
  }

  return { ok: true };
}

function safeFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function emitSuccess(payload, options) {
  if (options.quiet) {
    return;
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  const lines = ["Pack complete."];
  for (const variant of VARIANTS) {
    const snapshot = payload.snapshots[variant.name];
    if (!snapshot) {
      continue;
    }
    lines.push(
      `  ${variant.name}:  ${path.basename(snapshot.filePath)}  (${formatKb(snapshot.fileSize)})`
    );
  }
  lines.push(`  Source: ${payload.source}`);
  if (payload.failures.length > 0) {
    lines.push("");
    lines.push("Partial failures:");
    for (const failure of payload.failures) {
      lines.push(`  - ${failure.variant}: ${failure.reason}`);
    }
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

function fail(message, code, options, failures = []) {
  if (!options || !options.quiet) {
    if (options && options.json) {
      process.stdout.write(
        `${JSON.stringify({ status: "error", message, failures }, null, 2)}\n`
      );
    } else {
      process.stderr.write(`${message}\n`);
      if (failures.length > 0) {
        for (const failure of failures) {
          process.stderr.write(`- ${failure.variant}: ${failure.reason}\n`);
        }
      }
    }
  }
  process.exit(code);
}

function formatKb(bytes) {
  return `${Math.max(bytes, 0) / 1024 >= 10 ? Math.round(bytes / 1024) : (bytes / 1024).toFixed(1)}KB`;
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}
