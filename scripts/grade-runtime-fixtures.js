#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const FIXTURE_ROOT = path.resolve(__dirname, "..", "tests", "runtime-fixtures");

function formatFixtureLabel(grading) {
  const provenance = typeof grading.provenance === "string" ? grading.provenance : "unspecified";
  return `${grading.name}|${provenance}`;
}

function main() {
  try {
    const requested = process.argv.slice(2);
    const fixtureDirs = requested.length > 0 ? requested.map(resolveFixtureDir) : discoverFixtureDirs();

    let passed = 0;
    let failed = 0;

    for (const fixtureDir of fixtureDirs) {
      const gradingPath = path.join(fixtureDir, "grading.json");
      const grading = JSON.parse(fs.readFileSync(gradingPath, "utf8"));
      const fixtureLabel = formatFixtureLabel(grading);
      const transcriptPath = path.join(fixtureDir, grading.transcript);
      const transcript = loadTranscript(transcriptPath);

      for (const assertion of grading.assertions) {
        const result = evaluateAssertion(transcript, assertion);
        if (result.pass) {
          passed += 1;
          console.log(`PASS [${fixtureLabel}] ${assertion.id}`);
        } else {
          failed += 1;
          console.log(`FAIL [${fixtureLabel}] ${assertion.id}: ${result.reason}`);
        }
      }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error(`Fixture grading failed: ${error.message}`);
    process.exit(1);
  }
}

function resolveFixtureDir(nameOrPath) {
  const directPath = path.resolve(process.cwd(), nameOrPath);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const fixturePath = path.join(FIXTURE_ROOT, nameOrPath);
  if (fs.existsSync(fixturePath)) {
    return fixturePath;
  }

  throw new Error(`Fixture not found: ${nameOrPath}`);
}

function discoverFixtureDirs() {
  return fs
    .readdirSync(FIXTURE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(FIXTURE_ROOT, entry.name))
    .sort();
}

function loadTranscript(transcriptPath) {
  return fs
    .readFileSync(transcriptPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL in ${transcriptPath} at line ${index + 1}: ${error.message}`);
      }
    });
}

function evaluateAssertion(transcript, assertion) {
  switch (assertion.type) {
    case "message_contains":
      return evaluateMessageContains(transcript, assertion);
    case "tool_use":
      return evaluateToolUse(transcript, assertion);
    case "json_field_equals":
      return evaluateJsonFieldEquals(transcript, assertion);
    case "json_array_includes_object":
      return evaluateJsonArrayIncludesObject(transcript, assertion);
    default:
      return { pass: false, reason: `Unsupported assertion type: ${assertion.type}` };
  }
}

function evaluateMessageContains(transcript, assertion) {
  const actor = assertion.actor || "any";
  const pattern = assertion.pattern;
  const match = transcript.some((event) => actorMatches(event, actor) && extractText(event).includes(pattern));
  return match ? { pass: true } : { pass: false, reason: `No ${actor} message contained "${pattern}"` };
}

function evaluateToolUse(transcript, assertion) {
  const match = transcript.find((event) => {
    if (event.event !== "tool_use" || event.name !== assertion.name) {
      return false;
    }

    if (!assertion.inputContains) {
      return true;
    }

    return deepContains(event.input || {}, assertion.inputContains);
  });

  return match
    ? { pass: true }
    : { pass: false, reason: `No tool_use matched ${assertion.name} with the requested input` };
}

function evaluateJsonFieldEquals(transcript, assertion) {
  const blocks = collectJsonBlocks(transcript, assertion.actor || "assistant");
  for (const block of blocks) {
    const value = getByPath(block, assertion.path);
    if (deepEqual(value, assertion.equals)) {
      return { pass: true };
    }
  }

  return {
    pass: false,
    reason: `No JSON block had ${assertion.path} equal to ${JSON.stringify(assertion.equals)}`,
  };
}

function evaluateJsonArrayIncludesObject(transcript, assertion) {
  const blocks = collectJsonBlocks(transcript, assertion.actor || "assistant");
  for (const block of blocks) {
    const value = getByPath(block, assertion.path);
    if (Array.isArray(value) && value.some((entry) => deepContains(entry, assertion.contains))) {
      return { pass: true };
    }
  }

  return {
    pass: false,
    reason: `No JSON block had ${assertion.path} containing ${JSON.stringify(assertion.contains)}`,
  };
}

function collectJsonBlocks(transcript, actor) {
  const blocks = [];
  for (const event of transcript) {
    if (!actorMatches(event, actor)) {
      continue;
    }

    const text = extractText(event);
    const matches = text.matchAll(/```json\s*([\s\S]*?)```/g);
    for (const match of matches) {
      try {
        blocks.push(JSON.parse(match[1]));
      } catch (error) {
        // Ignore malformed blocks so the assertion can fail with a clear message.
      }
    }
  }
  return blocks;
}

function actorMatches(event, actor) {
  return actor === "any" || event.event === actor;
}

function extractText(event) {
  if (typeof event.text === "string") {
    return event.text;
  }
  return "";
}

function getByPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, segment) => {
    if (current === undefined || current === null) {
      return undefined;
    }
    return current[segment];
  }, value);
}

function deepContains(actual, expected) {
  if (expected === null || typeof expected !== "object" || Array.isArray(expected)) {
    return deepEqual(actual, expected);
  }

  if (actual === null || typeof actual !== "object" || Array.isArray(actual)) {
    return false;
  }

  return Object.entries(expected).every(([key, value]) => deepContains(actual[key], value));
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

main();
