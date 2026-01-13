#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const FRONTEND_DIR = path.join(repoRoot, 'src');
const TAURI_LIB_RS = path.join(repoRoot, 'src-tauri', 'src', 'lib.rs');

const IGNORED_DIR_NAMES = new Set([
  '.git',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
  'work',
]);

async function listSourceFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIR_NAMES.has(entry.name)) continue;
        await walk(path.join(currentDir, entry.name));
        continue;
      }

      if (!entry.isFile()) continue;
      if (!entry.name.match(/\.(ts|tsx|js|jsx)$/)) continue;

      results.push(path.join(currentDir, entry.name));
    }
  }

  await walk(rootDir);
  return results;
}

function extractTauriInvokes(sourceText: string): Set<string> {
  const results = new Set<string>();
  const invokeRegex = /\binvoke(?:<[^>]*>)?\(\s*(['"])([^'"]+)\1/g;

  let match: RegExpExecArray | null = null;
  while ((match = invokeRegex.exec(sourceText))) {
    const commandName = match[2];
    if (commandName) results.add(commandName);
  }
  return results;
}

function extractGenerateHandlerCommands(rustText: string): Set<string> {
  const handlerMatch = rustText.match(/generate_handler!\[\s*([\s\S]*?)\s*]/m);
  if (!handlerMatch) return new Set();

  const body = handlerMatch[1]
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = body
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return new Set(tokens);
}

function findRelativeObsidianInvokePaths(sourceText: string): number[] {
  const problems: number[] = [];
  const relativeObsidianPathRegex =
    /\binvoke(?:<[^>]*>)?\(\s*['"][^'"]+['"]\s*,\s*\{[\s\S]*?\bpath\s*:\s*['"]\.obsidian\//g;

  let match: RegExpExecArray | null = null;
  while ((match = relativeObsidianPathRegex.exec(sourceText))) {
    problems.push(match.index);
  }
  return problems;
}

function findForbiddenProcessPlatform(sourceText: string): boolean {
  return sourceText.includes('process.platform');
}

function findHardcodedReadDirDepth(rustText: string): boolean {
  const hardcodedDepthRegex = /\bread_dir_recursive\(&path,\s*0,\s*\d+\s*\)/;
  return hardcodedDepthRegex.test(rustText);
}

async function main(): Promise<void> {
  const failures: string[] = [];

  const rustText = await fs.readFile(TAURI_LIB_RS, 'utf8');
  const rustCommands = extractGenerateHandlerCommands(rustText);

  const frontendFiles = await listSourceFiles(FRONTEND_DIR);

  const invokedCommandNames = new Set<string>();
  for (const filePath of frontendFiles) {
    const text = await fs.readFile(filePath, 'utf8');
    for (const commandName of extractTauriInvokes(text)) {
      invokedCommandNames.add(commandName);
    }
  }

  const missingInRust = Array.from(invokedCommandNames).filter((name) => !rustCommands.has(name));
  if (missingInRust.length > 0) {
    failures.push(
      `Frontend invokes missing in Rust generate_handler!: ${missingInRust
        .sort()
        .map((n) => `"${n}"`)
        .join(', ')}`
    );
  }

  const relativeObsidianPathFiles: string[] = [];
  for (const filePath of frontendFiles) {
    const text = await fs.readFile(filePath, 'utf8');
    if (findRelativeObsidianInvokePaths(text).length > 0) {
      relativeObsidianPathFiles.push(path.relative(repoRoot, filePath));
    }
  }
  if (relativeObsidianPathFiles.length > 0) {
    failures.push(
      `Relative ".obsidian/..." paths used in invoke({path: ...}): ${relativeObsidianPathFiles
        .sort()
        .join(', ')}`
    );
  }

  const processPlatformFiles: string[] = [];
  for (const filePath of frontendFiles) {
    const text = await fs.readFile(filePath, 'utf8');
    if (findForbiddenProcessPlatform(text)) {
      processPlatformFiles.push(path.relative(repoRoot, filePath));
    }
  }
  if (processPlatformFiles.length > 0) {
    failures.push(
      `Forbidden "process.platform" usage in frontend: ${processPlatformFiles.sort().join(', ')}`
    );
  }

  if (findHardcodedReadDirDepth(rustText)) {
    failures.push(
      `Hardcoded read_directory recursion depth detected in ${path.relative(repoRoot, TAURI_LIB_RS)}`
    );
  }

  if (failures.length > 0) {
    process.stderr.write(
      `Obsidian invariants failed:\n${failures.map((f) => `- ${f}`).join('\n')}\n`
    );
    process.exit(1);
  }

  process.stdout.write('Obsidian invariants OK\n');
}

await main();

