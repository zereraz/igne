#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const researchDir = path.join(repoRoot, 'research-oss', 'obsidian-research');
const pluginsPath = path.join(researchDir, 'community-plugins.json');
const statsPath = path.join(researchDir, 'community-plugin-stats.json');

const topPluginsOutPath = path.join(researchDir, 'TOP_PLUGINS_BY_DOWNLOADS.md');
const topAiPluginsOutPath = path.join(researchDir, 'TOP_AI_PLUGINS_BY_DOWNLOADS.md');

const TOP_N = 30;

const AI_KEYWORDS: RegExp[] = [
  /gpt/i,
  /openai/i,
  /anthropic/i,
  /claude/i,
  /ollama/i,
  /\bllm\b/i,
  /chatgpt/i,
  /copilot/i,
  /embedding/i,
  /vector/i,
  /semantic search/i,
  /whisper/i,
  /transcrib/i,
];

type CommunityPlugin = {
  id: string;
  name: string;
  author?: string;
  description?: string;
  repo?: string;
};

type PluginStats = Record<string, { downloads?: number } & Record<string, unknown>>;

function isoDate(date: number | string | Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

function formatPluginLine(
  rank: number,
  row: CommunityPlugin & { downloads: number }
): string {
  const repo = row.repo ? `\`${row.repo}\`` : '`(none)`';
  const desc = (row.description || '').trim();
  return `${rank}. \`${row.id}\` — ${row.name} — ${row.downloads.toLocaleString('en-US')} — ${repo} — ${desc}`;
}

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function main(): Promise<void> {
  const plugins = await loadJson<CommunityPlugin[]>(pluginsPath);
  const stats = await loadJson<PluginStats>(statsPath);

  const metaById = new Map(plugins.map((p) => [p.id, p]));

  const rows: Array<CommunityPlugin & { downloads: number }> = [];
  for (const [pluginId, stat] of Object.entries(stats)) {
    const meta = metaById.get(pluginId);
    if (!meta) continue;
    rows.push({
      ...meta,
      downloads: Number(stat?.downloads ?? 0),
    });
  }

  rows.sort((a, b) => b.downloads - a.downloads);
  const top = rows.slice(0, TOP_N);

  const generated = isoDate(Date.now());
  const topPluginsMd = [
    '# Top Obsidian community plugins by downloads (snapshot)',
    '',
    `**Generated:** ${generated}  `,
    '**Method:** `community-plugins.json` ⋈ `community-plugin-stats.json` by `id`, sorted by `stats.downloads` desc.',
    '',
    `## Top ${TOP_N}`,
    '',
    ...top.map((row, idx) => formatPluginLine(idx + 1, row)),
    '',
    '## What this implies (high-level)',
    '',
    '- “Drop-in” isn’t just Markdown editing: the top plugins cluster heavily around **automation**, **structured querying**, **tasks/calendar**, **diagrams/canvas**, **sync/backup**, and **deep search**.',
    '- If Igne can’t run community plugins with high fidelity, it must re-implement large swaths of Obsidian’s ecosystem natively (very expensive).',
    '',
  ].join('\n');

  const aiRows = rows
    .filter((row) => {
      const haystack = `${row.id}\n${row.name}\n${row.description ?? ''}`;
      return AI_KEYWORDS.some((re) => re.test(haystack));
    })
    .slice(0, TOP_N);

  const keywordText =
    'gpt|openai|anthropic|claude|ollama|llm|chatgpt|copilot|embedding|vector|semantic search|whisper|transcrib';
  const topAiMd = [
    '# AI-related Obsidian community plugins by downloads (snapshot)',
    '',
    `**Generated:** ${generated}  `,
    `**Method:** keyword filter on \`id/name/description\` (strong signals only: \`${keywordText}\`), then sort by downloads desc.`,
    '',
    `## Top ${TOP_N}`,
    '',
    ...aiRows.map((row, idx) => formatPluginLine(idx + 1, row)),
    '',
    '## What this implies (high-level)',
    '',
    '- “AI in Obsidian” is usually **chat + vault context (RAG)**, **semantic search**, and **automations that write back into notes**.',
    '- A drop-in replacement needs a **safe tool layer** (file ops, search, link navigation) so AI can act without becoming a security hole.',
    '',
  ].join('\n');

  await fs.writeFile(topPluginsOutPath, topPluginsMd, 'utf8');
  await fs.writeFile(topAiPluginsOutPath, topAiMd, 'utf8');

  process.stdout.write(`Wrote ${path.relative(repoRoot, topPluginsOutPath)}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, topAiPluginsOutPath)}\n`);
}

await main();

