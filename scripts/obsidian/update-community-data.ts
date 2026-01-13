#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const UPSTREAM_SOURCES_PATH = path.join(repoRoot, 'compat', 'obsidian-upstream', 'sources.json');

const RESEARCH_DIR = path.join(repoRoot, 'research-oss', 'obsidian-research');
const OUTPUT_FILES = [
  { key: 'plugins', filename: 'community-plugins.json' },
  { key: 'pluginStats', filename: 'community-plugin-stats.json' },
  { key: 'cssThemes', filename: 'community-css-themes.json' },
] as const;
const METADATA_PATH = path.join(RESEARCH_DIR, 'official-snapshot.json');

type UpstreamSources = {
  obsidianReleases?: {
    community?: Record<string, string>;
  };
};

function sha256Hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function toIsoUtc(date: number | string | Date): string {
  return new Date(date).toISOString();
}

async function fetchText(url: string): Promise<{
  text: string;
  headers: { etag: string | null; lastModified: string | null; contentType: string | null };
}> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'igne-obsidian-community-data',
      accept: 'application/json,text/plain,*/*',
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }
  const text = await response.text();
  return {
    text,
    headers: {
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentType: response.headers.get('content-type'),
    },
  };
}

async function main(): Promise<void> {
  const sourcesRaw = await fs.readFile(UPSTREAM_SOURCES_PATH, 'utf8');
  const sources = JSON.parse(sourcesRaw) as UpstreamSources;
  const community = sources?.obsidianReleases?.community;
  if (!community) {
    throw new Error(`Missing obsidianReleases.community in ${UPSTREAM_SOURCES_PATH}`);
  }

  await fs.mkdir(RESEARCH_DIR, { recursive: true });

  const capturedAtUtc = toIsoUtc(Date.now());
  const metadata: {
    capturedAtUtc: string;
    sources: { upstreamSourcesFile: string };
    files: Record<
      string,
      {
        url: string;
        sha256: string;
        bytes: number;
        headers: { etag: string | null; lastModified: string | null; contentType: string | null };
      }
    >;
  } = {
    capturedAtUtc,
    sources: {
      upstreamSourcesFile: path.relative(repoRoot, UPSTREAM_SOURCES_PATH),
    },
    files: {},
  };

  for (const file of OUTPUT_FILES) {
    const url = community[file.key];
    if (!url) throw new Error(`Missing community URL for "${file.key}" in ${UPSTREAM_SOURCES_PATH}`);

    const destinationPath = path.join(RESEARCH_DIR, file.filename);
    const { text, headers } = await fetchText(url);

    // Validate JSON and normalize formatting for stable diffs.
    const parsed = JSON.parse(text) as unknown;
    const pretty = JSON.stringify(parsed, null, 2) + '\n';
    const buffer = Buffer.from(pretty, 'utf8');

    await fs.writeFile(destinationPath, buffer);

    metadata.files[file.filename] = {
      url,
      sha256: sha256Hex(buffer),
      bytes: buffer.byteLength,
      headers,
    };

    process.stdout.write(`Updated ${path.relative(repoRoot, destinationPath)}\n`);
  }

  await fs.writeFile(METADATA_PATH, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  process.stdout.write(`Wrote ${path.relative(repoRoot, METADATA_PATH)}\n`);
}

await main();

