#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_PACKAGE_NAME = 'obsidian';
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
      'user-agent': 'igne-contract-updater',
      accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }
  return (await response.json()) as T;
}

async function downloadToFile(url: string, destinationPath: string): Promise<number> {
  const response = await fetch(url, { headers: { 'user-agent': 'igne-contract-updater' } });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText} (${url})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(destinationPath, buffer);
  return buffer.byteLength;
}

function sha256Hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function extractFileFromTgz(args: {
  tgzPath: string;
  internalPath: string;
  destinationPath: string;
}): Promise<{ bytes: number; sha256: string }> {
  const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igne-obsidian-contract-'));
  try {
    await execFile('tar', ['-xzf', args.tgzPath, '-C', extractDir, args.internalPath]);
    const extractedPath = path.join(extractDir, args.internalPath);
    const contentBuffer = await fs.readFile(extractedPath);
    await fs.mkdir(path.dirname(args.destinationPath), { recursive: true });
    await fs.writeFile(args.destinationPath, contentBuffer);
    return { bytes: contentBuffer.byteLength, sha256: sha256Hex(contentBuffer) };
  } finally {
    await fs.rm(extractDir, { recursive: true, force: true });
  }
}

function toIsoUtc(date: number | string | Date): string {
  return new Date(date).toISOString();
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const requestedVersion = getArgValue(argv, '--version');
  const requestedTag = getArgValue(argv, '--tag') ?? 'latest';

  const packageName = DEFAULT_PACKAGE_NAME;

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

  const packageVersionMetadata = await fetchJson<any>(
    `https://registry.npmjs.org/${packageName}/${resolvedVersion}`
  );

  const distTarball = packageVersionMetadata?.dist?.tarball;
  if (!distTarball) {
    throw new Error(`No dist.tarball found for ${packageName}@${resolvedVersion}`);
  }

  await fs.mkdir(CONTRACT_DIR, { recursive: true });

  const downloadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'igne-obsidian-tarball-'));
  const tgzPath = path.join(downloadDir, `${packageName}-${resolvedVersion}.tgz`);
  try {
    await downloadToFile(distTarball, tgzPath);

    const { sha256, bytes } = await extractFileFromTgz({
      tgzPath,
      internalPath: 'package/obsidian.d.ts',
      destinationPath: CONTRACT_TYPES_PATH,
    });

    const metadata = {
      package: {
        name: packageName,
        version: resolvedVersion,
        license: packageVersionMetadata.license ?? null,
        repository: packageVersionMetadata.repository ?? null,
        dist: {
          tarball: distTarball,
          shasum: packageVersionMetadata?.dist?.shasum ?? null,
          integrity: packageVersionMetadata?.dist?.integrity ?? null,
        },
      },
      capturedAtUtc: toIsoUtc(Date.now()),
      files: {
        'obsidian.d.ts': { sha256, bytes },
      },
    };

    await fs.writeFile(CONTRACT_METADATA_PATH, JSON.stringify(metadata, null, 2) + '\n', 'utf8');

    process.stdout.write(
      `Updated Obsidian contract: ${packageName}@${resolvedVersion}\n` +
        `- ${path.relative(repoRoot, CONTRACT_TYPES_PATH)} (${bytes} bytes)\n` +
        `- ${path.relative(repoRoot, CONTRACT_METADATA_PATH)}\n`
    );
  } finally {
    await fs.rm(downloadDir, { recursive: true, force: true });
  }
}

await main();

