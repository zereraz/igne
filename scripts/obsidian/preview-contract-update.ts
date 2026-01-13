#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const CONTRACT_DIR = path.join(repoRoot, 'compat', 'obsidian-api');
const CONTRACT_TYPES_PATH = path.join(CONTRACT_DIR, 'obsidian.d.ts');
const CONTRACT_METADATA_PATH = path.join(CONTRACT_DIR, 'metadata.json');

function getArgValue(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'igne-contract-preview',
      accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }
  return (await response.json()) as T;
}

async function downloadToFile(url: string, destinationPath: string): Promise<void> {
  const response = await fetch(url, { headers: { 'user-agent': 'igne-contract-preview' } });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText} (${url})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(destinationPath, buffer);
}

async function extractTypesToTemp(args: { tgzPath: string }): Promise<{
  extractDir: string;
  extractedPath: string;
}> {
  const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igne-obsidian-contract-preview-'));
  const internalPath = 'package/obsidian.d.ts';
  const extractedPath = path.join(extractDir, internalPath);
  await execFile('tar', ['-xzf', args.tgzPath, '-C', extractDir, internalPath]);
  return { extractDir, extractedPath };
}

async function runDiff(args: { oldFile: string; newFile: string }): Promise<string> {
  try {
    const { stdout } = await execFile('git', ['diff', '--no-index', '--', args.oldFile, args.newFile]);
    return stdout as unknown as string;
  } catch (error: any) {
    // git diff exits with code 1 when files differ; still has stdout with diff.
    if (error?.stdout) return String(error.stdout);
    throw error;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const requestedVersion = getArgValue(argv, '--version');
  const requestedTag = getArgValue(argv, '--tag') ?? 'latest';
  const writeToFile = argv.includes('--write');

  const metadataRaw = await fs.readFile(CONTRACT_METADATA_PATH, 'utf8');
  const metadata = JSON.parse(metadataRaw) as { package?: { version?: string } };
  const currentVersion = metadata?.package?.version ?? 'unknown';

  const packageName = 'obsidian';
  const registryMetadata = await fetchJson<any>(`https://registry.npmjs.org/${packageName}`);
  const resolvedVersion = requestedVersion
    ? requestedVersion
    : registryMetadata?.['dist-tags']?.[requestedTag];
  if (!resolvedVersion) {
    throw new Error(
      requestedVersion
        ? `Could not resolve package version for ${packageName}@${requestedVersion}`
        : `Could not resolve dist-tag "${requestedTag}" for ${packageName}`
    );
  }

  if (resolvedVersion === currentVersion) {
    process.stdout.write(`Already on obsidian@${currentVersion} (no diff)\n`);
    return;
  }

  const packageVersionMetadata = await fetchJson<any>(
    `https://registry.npmjs.org/${packageName}/${resolvedVersion}`
  );
  const tarball = packageVersionMetadata?.dist?.tarball;
  if (!tarball) throw new Error(`No dist.tarball found for ${packageName}@${resolvedVersion}`);

  const downloadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igne-obsidian-contract-tarball-'));
  const tgzPath = path.join(downloadDir, `${packageName}-${resolvedVersion}.tgz`);

  let extractDir: string | null = null;
  try {
    await downloadToFile(tarball, tgzPath);
    const extracted = await extractTypesToTemp({ tgzPath });
    extractDir = extracted.extractDir;

    const diff = await runDiff({ oldFile: CONTRACT_TYPES_PATH, newFile: extracted.extractedPath });

    if (!writeToFile) {
      process.stdout.write(
        `Diff obsidian@${currentVersion} -> obsidian@${resolvedVersion}\n\n` +
          (diff || '(no diff)') +
          '\n'
      );
      process.stdout.write(
        '\nTip: add --write to save a patch file under compat/obsidian-api/diffs/\n'
      );
      return;
    }

    const diffsDir = path.join(CONTRACT_DIR, 'diffs');
    await fs.mkdir(diffsDir, { recursive: true });
    const patchPath = path.join(diffsDir, `obsidian-${currentVersion}-to-${resolvedVersion}.patch`);
    await fs.writeFile(patchPath, diff || '', 'utf8');
    process.stdout.write(`Wrote ${path.relative(repoRoot, patchPath)}\n`);
  } finally {
    await fs.rm(downloadDir, { recursive: true, force: true });
    if (extractDir) {
      await fs.rm(extractDir, { recursive: true, force: true });
    }
  }
}

await main();

