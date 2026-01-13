#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const CONTRACT_DIR = path.join(repoRoot, 'compat', 'obsidian-api');
const CONTRACT_TYPES_PATH = path.join(CONTRACT_DIR, 'obsidian.d.ts');
const CONTRACT_METADATA_PATH = path.join(CONTRACT_DIR, 'metadata.json');

type ContractMetadata = {
  package?: { version?: string };
  files?: Record<string, { sha256?: string; bytes?: number }>;
};

function sha256Hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main(): Promise<void> {
  const metadataRaw = await fs.readFile(CONTRACT_METADATA_PATH, 'utf8');
  const metadata = JSON.parse(metadataRaw) as ContractMetadata;

  const expected = metadata?.files?.['obsidian.d.ts'];
  if (!expected?.sha256) {
    throw new Error(`Missing files["obsidian.d.ts"].sha256 in ${CONTRACT_METADATA_PATH}`);
  }

  const contentBuffer = await fs.readFile(CONTRACT_TYPES_PATH);
  const actualSha = sha256Hex(contentBuffer);
  const actualBytes = contentBuffer.byteLength;

  const expectedSha = String(expected.sha256);
  const expectedBytes = Number(expected.bytes);

  const problems: string[] = [];
  if (actualSha !== expectedSha) {
    problems.push(`sha256 mismatch: expected ${expectedSha}, got ${actualSha}`);
  }
  if (Number.isFinite(expectedBytes) && actualBytes !== expectedBytes) {
    problems.push(`byte size mismatch: expected ${expectedBytes}, got ${actualBytes}`);
  }

  if (problems.length > 0) {
    process.stderr.write(
      `Obsidian contract check failed (${path.relative(repoRoot, CONTRACT_DIR)}):\n` +
        problems.map((p) => `- ${p}`).join('\n') +
        '\n\n' +
        `Fix: npm run obsidian:update-contract\n`
    );
    process.exit(1);
  }

  const version = metadata?.package?.version ?? 'unknown';
  process.stdout.write(`Obsidian contract OK: obsidian@${version}\n`);
}

await main();

