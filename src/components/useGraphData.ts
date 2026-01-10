import { useMemo } from 'react';
import { searchStore } from '../stores/searchStore';

export interface GraphNode {
  id: string;
  name: string;
  path: string;
  group: number;
  val: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  index?: number;
}

export function useGraphData(files: Array<{ path: string; name: string; content?: string }>): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  return useMemo(() => {
    const nodes: GraphNode[] = files.map((file) => ({
      id: file.path,
      name: file.name,
      path: file.path,
      group: 1,
      val: 1,
    }));

    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map(n => n.id));

    const linkMap = new Map<string, Set<string>>();

    files.forEach((file) => {
      if (!file.content) return;

      // Extract wikilinks: [[link]]
      const wikilinkRegex = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
      let match;

      while ((match = wikilinkRegex.exec(file.content)) !== null) {
        const targetName = match[1];
        const targetPath = searchStore.getFilePathByName(targetName);

        // Only create links to files that exist in our node list
        if (targetPath && targetPath !== file.path && validNodeIds.has(targetPath)) {
          if (!linkMap.has(file.path)) {
            linkMap.set(file.path, new Set());
          }
          linkMap.get(file.path)!.add(targetPath);
        }
      }

      // Extract tags: #tag
      const tagRegex = /#([a-zA-Z0-9_\-\/]+)/g;
      while ((match = tagRegex.exec(file.content)) !== null) {
        const tag = match[1];
        // Create a virtual node for the tag
        const tagId = `tag:${tag}`;
        if (!linkMap.has(file.path)) {
          linkMap.set(file.path, new Set());
        }
        linkMap.get(file.path)!.add(tagId);
      }
    });

    const links: GraphLink[] = [];
    linkMap.forEach((targets, source) => {
      targets.forEach((target) => {
        links.push({ source: source as any, target: target as any, value: 1 });
      });
    });

    // Add tag nodes
    const tagNodes = new Map<string, GraphNode>();
    links.forEach((link) => {
      const target = typeof link.target === 'string' ? link.target : link.target.id;
      if (target.startsWith('tag:')) {
        const tagName = target.replace('tag:', '');
        if (!tagNodes.has(target)) {
          tagNodes.set(target, {
            id: target,
            name: `#${tagName}`,
            path: target,
            group: 2,
            val: 2,
          });
        }
      }
    });

    return {
      nodes: [...nodes, ...Array.from(tagNodes.values())],
      links,
    };
  }, [files]);
}
