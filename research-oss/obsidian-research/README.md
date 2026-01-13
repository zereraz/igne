# Obsidian Research (for Igne drop-in parity)

This folder stores research artifacts used to prioritize what Igne must implement to be a credible OSS “drop-in” replacement for Obsidian (anchored to the currently-vendored Obsidian API contract under `compat/obsidian-api/`).

## Data sources (community ecosystem)

These JSON files are pulled from Obsidian’s public “community store” lists:
- `community-plugins.json` — plugin metadata (id/name/author/description/repo)
- `community-plugin-stats.json` — download counts + last-updated timestamps per plugin
- `community-css-themes.json` — theme metadata

Notes:
- There is **no** upstream `community-css-theme-stats.json` at the expected URL (it 404s), so theme download-rank analysis is not possible from the same dataset.

## Generated outputs

- `TOP_PLUGINS_BY_DOWNLOADS.md` — top plugins (downloads) to infer dominant workflows
- `TOP_AI_PLUGINS_BY_DOWNLOADS.md` — AI-related plugins (keyword filtered) to infer AI workflows
- `WORKFLOW_CLUSTERS_AND_REQUIREMENTS.md` — workflow clusters → concrete drop-in requirements
- `PROGRAMMER_WORKFLOWS.md` — how programmers use Obsidian (threads + docs → workflows)
- `AI_WORKFLOWS.md` — how AI is used inside Obsidian (plugins + threads → workflows)
- `DROP_IN_REQUIREMENTS_FROM_REAL_WORLD.md` — “drop-in replacement” requirements grounded in real usage
- `SOURCES.md` — source index (official docs, hub, forum, plugin docs)

## Repro / regeneration

To regenerate the “top plugins” ranking from the JSON files:

```bash
python3 - <<'PY'
import json
plugins=json.load(open('research-oss/obsidian-research/community-plugins.json'))
stats=json.load(open('research-oss/obsidian-research/community-plugin-stats.json'))
meta={p['id']:p for p in plugins}
rows=[]
for pid,s in stats.items():
  m=meta.get(pid)
  if not m: continue
  rows.append({**m,'downloads':s.get('downloads',0)})
rows.sort(key=lambda r:r['downloads'], reverse=True)
for i,r in enumerate(rows[:30], start=1):
  print(i, r['id'], r['downloads'], r['repo'])
PY
```
