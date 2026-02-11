import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { searchStore } from '../stores/searchStore';

interface GraphNode {
  id: string;
  name: string;
  path: string;
  isCurrent: boolean;
  depth: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface LocalGraphViewProps {
  files: Array<{ path: string; name: string; content?: string }>;
  currentFilePath: string;
  onNodeClick?: (path: string) => void;
  onOpenFullGraph?: () => void;
  depth?: number; // How many levels of connections to show (default 1)
}

function useLocalGraphData(
  files: Array<{ path: string; name: string; content?: string }>,
  currentFilePath: string,
  maxDepth: number = 1
) {
  return useMemo(() => {
    const fileMap = new Map(files.map(f => [f.path, f]));
    const currentFile = fileMap.get(currentFilePath);

    if (!currentFile) {
      return { nodes: [], links: [] };
    }

    // Build adjacency list for all files
    const outgoing = new Map<string, Set<string>>(); // file -> files it links to
    const incoming = new Map<string, Set<string>>(); // file -> files that link to it

    files.forEach(file => {
      if (!file.content) return;

      const wikilinkRegex = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
      let match;

      while ((match = wikilinkRegex.exec(file.content)) !== null) {
        const targetName = match[1];
        const targetPath = searchStore.getFilePathByName(targetName);

        if (targetPath && targetPath !== file.path && fileMap.has(targetPath)) {
          if (!outgoing.has(file.path)) outgoing.set(file.path, new Set());
          outgoing.get(file.path)!.add(targetPath);

          if (!incoming.has(targetPath)) incoming.set(targetPath, new Set());
          incoming.get(targetPath)!.add(file.path);
        }
      }
    });

    // BFS to find nodes within depth
    const visited = new Map<string, number>(); // path -> depth
    const queue: Array<{ path: string; depth: number }> = [{ path: currentFilePath, depth: 0 }];
    visited.set(currentFilePath, 0);

    while (queue.length > 0) {
      const { path, depth } = queue.shift()!;

      if (depth >= maxDepth) continue;

      // Add outgoing links
      const out = outgoing.get(path) || new Set();
      out.forEach(targetPath => {
        if (!visited.has(targetPath)) {
          visited.set(targetPath, depth + 1);
          queue.push({ path: targetPath, depth: depth + 1 });
        }
      });

      // Add incoming links (backlinks)
      const inc = incoming.get(path) || new Set();
      inc.forEach(sourcePath => {
        if (!visited.has(sourcePath)) {
          visited.set(sourcePath, depth + 1);
          queue.push({ path: sourcePath, depth: depth + 1 });
        }
      });
    }

    // Build nodes
    const nodes: GraphNode[] = [];
    visited.forEach((depth, path) => {
      const file = fileMap.get(path);
      if (file) {
        nodes.push({
          id: path,
          name: file.name.replace(/\.md$/, ''),
          path: path,
          isCurrent: path === currentFilePath,
          depth: depth,
        });
      }
    });

    // Build links (only between visited nodes)
    const links: GraphLink[] = [];
    const visitedSet = new Set(visited.keys());

    visited.forEach((_, path) => {
      const out = outgoing.get(path) || new Set();
      out.forEach(targetPath => {
        if (visitedSet.has(targetPath)) {
          links.push({ source: path, target: targetPath });
        }
      });
    });

    return { nodes, links };
  }, [files, currentFilePath, maxDepth]);
}

export function LocalGraphView({
  files,
  currentFilePath,
  onNodeClick,
  onOpenFullGraph,
  depth = 1
}: LocalGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { nodes, links } = useLocalGraphData(files, currentFilePath, depth);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const g = svg.append('g');

    // Find current node for centering
    const currentNode = nodes.find(n => n.isCurrent);

    // Create force simulation - smaller distances for local graph
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25));

    // Create links
    g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--background-modifier-border)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Create nodes
    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    // Node circles
    node
      .append('circle')
      .attr('r', d => d.isCurrent ? 8 : 6)
      .attr('fill', d => d.isCurrent ? 'var(--color-accent)' : 'var(--background-modifier-border)')
      .attr('stroke', d => d.isCurrent ? 'var(--color-accent)' : 'var(--text-muted)')
      .attr('stroke-width', d => d.isCurrent ? 2 : 1.5)
      .on('mouseover', function(_, d) {
        if (!d.isCurrent) {
          d3.select(this)
            .attr('fill', 'var(--text-muted)')
            .attr('stroke-width', 2);
        }
      })
      .on('mouseout', function(_, d) {
        if (!d.isCurrent) {
          d3.select(this)
            .attr('fill', 'var(--background-modifier-border)')
            .attr('stroke-width', 1.5);
        }
      })
      .on('click', (_, d) => {
        if (!d.isCurrent) {
          onNodeClick?.(d.path);
        }
      });

    // Node labels
    node
      .append('text')
      .text(d => d.name)
      .attr('x', 10)
      .attr('y', 3)
      .attr('fill', d => d.isCurrent ? 'var(--text-normal)' : 'var(--text-muted)')
      .attr('font-size', d => d.isCurrent ? '11px' : '10px')
      .attr('font-weight', d => d.isCurrent ? '500' : '400')
      .attr('font-family', 'var(--font-interface)')
      .attr('pointer-events', 'none');

    // Update positions on tick
    const link = g.selectAll('line');
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x || 0)
        .attr('y1', (d: any) => d.source.y || 0)
        .attr('x2', (d: any) => d.target.x || 0)
        .attr('y2', (d: any) => d.target.y || 0);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Center on current node after simulation settles
    simulation.on('end', () => {
      if (currentNode && currentNode.x && currentNode.y) {
        const scale = 1;
        const x = width / 2 - currentNode.x * scale;
        const y = height / 2 - currentNode.y * scale;
        svg.transition().duration(300).call(
          zoom.transform as any,
          d3.zoomIdentity.translate(x, y).scale(scale)
        );
      }
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, onNodeClick]);

  if (nodes.length === 0) {
    return (
      <div style={{
        padding: '16px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        fontSize: '12px',
        fontFamily: 'var(--font-interface)',
      }}>
        <p>No connections</p>
        <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-faint)' }}>
          Add [[wikilinks]] to see the graph
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--background-primary)',
        }}
      />
      {/* Open full graph button */}
      {onOpenFullGraph && (
        <button
          onClick={onOpenFullGraph}
          title="Open full graph"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'all 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--background-modifier-hover)';
            e.currentTarget.style.color = 'var(--text-normal)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      )}
      {/* Connection count */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          fontSize: '10px',
          color: 'var(--text-faint)',
          fontFamily: 'var(--font-interface)',
        }}
      >
        {nodes.length - 1} connection{nodes.length - 1 !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
