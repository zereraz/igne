import { searchStore } from '../stores/searchStore';
import type { WikilinkSearchResult } from '../types';

export function searchWikilinks(query: string): WikilinkSearchResult[] {
  console.log('[searchWikilinks] Searching for:', query);

  if (!query.trim()) {
    const all = searchStore.getAllNoteNames();
    console.log('[searchWikilinks] All note names:', all);
    return all.map((name) => ({
      name,
      path: searchStore.getFilePathByName(name) || '',
    }));
  }

  const results = searchStore.searchFiles(query);
  const allNames = searchStore.getAllNoteNames();

  console.log('[searchWikilinks] Fuzzy results:', results.map(r => r.name));
  console.log('[searchWikilinks] All names:', allNames);

  // Combine fuzzy results with partial matches
  const names = new Set(results.map((r) => r.name));
  for (const name of allNames) {
    if (!names.has(name) && name.toLowerCase().includes(query.toLowerCase())) {
      names.add(name);
    }
  }

  const finalResults = Array.from(names).map((name) => ({
    name,
    path: searchStore.getFilePathByName(name) || '',
  }));

  console.log('[searchWikilinks] Final results:', finalResults);
  return finalResults;
}
