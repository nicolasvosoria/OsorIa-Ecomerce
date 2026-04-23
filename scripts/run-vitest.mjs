import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const runIndex = args.indexOf("--run");
const rawPatterns = runIndex >= 0 ? args.slice(runIndex + 1) : args;

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(pattern) {
  const normalized = pattern.replaceAll(path.sep, "/");
  const regexSource = normalized
    .split("**")
    .map((part) => part.split("*").map(escapeRegex).join("[^/]*"))
    .join(".*");

  return new RegExp(`^${regexSource}$`);
}

function walkFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }

    return [fullPath];
  });
}

function expandPatterns(patterns) {
  if (patterns.length === 0) {
    return [];
  }

  const allFiles = walkFiles(path.join(rootDir, "tests"));
  const matches = new Set();

  patterns.forEach((pattern) => {
    if (!pattern.includes("*")) {
      matches.add(pattern);
      return;
    }

    const regex = globToRegex(pattern);
    allFiles.forEach((filePath) => {
      const relativePath = path
        .relative(rootDir, filePath)
        .replaceAll(path.sep, "/");
      if (regex.test(relativePath)) {
        matches.add(relativePath);
      }
    });
  });

  return Array.from(matches);
}

const expandedFiles = expandPatterns(rawPatterns);
const vitestArgs = ["run", "-c", "vitest.config.ts"];

if (expandedFiles.length > 0) {
  vitestArgs.push(...expandedFiles);
}

const result = spawnSync("npx", ["vitest", ...vitestArgs], {
  stdio: "inherit",
  cwd: rootDir,
  shell: false,
});

process.exit(result.status ?? 1);
