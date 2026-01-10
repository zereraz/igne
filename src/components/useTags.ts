import { useMemo } from 'react';

export interface TagInfo {
  tag: string;
  count: number;
  files: string[];
}

export function useTags(files: Array<{ path: string; content?: string }>): TagInfo[] {
  return useMemo(() => {
    const tagMap = new Map<string, Set<string>>();

    files.forEach((file) => {
      if (!file.content) return;

      // Extract inline tags (#tag) - must be at word boundary
      // Match # that is at start of string or preceded by non-word character
      const inlineTagRegex = /(?<=^|\W)#([a-zA-Z0-9_\-\/]+)/g;
      let match;
      while ((match = inlineTagRegex.exec(file.content)) !== null) {
        const tag = match[1];
        if (!tagMap.has(tag)) {
          tagMap.set(tag, new Set());
        }
        tagMap.get(tag)!.add(file.path);
      }

      // Extract YAML frontmatter tags
      const yamlRegex = /^---\n([\s\S]*?)\n---/;
      const yamlMatch = file.content.match(yamlRegex);
      if (yamlMatch) {
        const yamlContent = yamlMatch[1];
        const tagsRegex = /tags:\s*\[(.*?)\]/;
        const tagsMatch = yamlContent.match(tagsRegex);
        if (tagsMatch) {
          const tags = tagsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, ''));
          tags.forEach((tag) => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, new Set());
            }
            tagMap.get(tag)!.add(file.path);
          });
        }
      }
    });

    // Convert to array and sort by count (descending)
    const tags: TagInfo[] = Array.from(tagMap.entries())
      .map(([tag, files]) => ({
        tag,
        count: files.size,
        files: Array.from(files),
      }))
      .sort((a, b) => b.count - a.count);

    return tags;
  }, [files]);
}
