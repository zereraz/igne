import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGraphData, GraphNode, GraphLink } from './useGraphData';
import { Maximize2 } from 'lucide-react';

interface GraphViewProps {
  files: Array<{ path: string; name: string; content?: string }>;
  onNodeClick?: (path: string) => void;
}

export function GraphView({ files, onNodeClick }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { nodes, links } = useGraphData(files);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const g = svg.append('g');

    // Create force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Create links
    const link = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#3f3f46')
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
      .attr('r', (d) => (d.id.startsWith('tag:') ? 5 : 8))
      .attr('fill', (d) => (d.id.startsWith('tag:') ? '#a78bfa' : '#3f3f46'))
      .attr('stroke', (d) => (d.id.startsWith('tag:') ? '#a78bfa' : '#a78bfa'))
      .attr('stroke-width', 2)
      .on('mouseover', function () {
        d3.select(this).attr('stroke-width', 4).attr('fill', '#52525b');
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke-width', 2);
      })
      .on('click', function (_event, d) {
        if (!d.id.startsWith('tag:')) {
          onNodeClick?.(d.path);
        }
      });

    // Node labels
    node
      .append('text')
      .text((d) => d.name)
      .attr('x', 12)
      .attr('y', 4)
      .attr('fill', '#a1a1aa')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('pointer-events', 'none');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x || 0)
        .attr('y1', (d) => (d.source as GraphNode).y || 0)
        .attr('x2', (d) => (d.target as GraphNode).x || 0)
        .attr('y2', (d) => (d.target as GraphNode).y || 0);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, onNodeClick]);

  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        (d3.zoom as any).scaleBy as any,
        1.3
      );
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        (d3.zoom as any).scaleBy as any,
        0.7
      );
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(
        (d3.zoom as any).transform as any,
        d3.zoomIdentity
      );
    }
  };

  if (nodes.length === 0) {
    return (
      <div style={{ padding: '1rem', color: '#71717a', textAlign: 'center' }}>
        <p>No graph data</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Create notes with links to generate graph
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
          backgroundColor: '#18181b',
          borderRadius: '4px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            padding: '4px 8px',
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            color: '#a1a1aa',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3f3f46';
            e.currentTarget.style.color = '#e4e4e7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#27272a';
            e.currentTarget.style.color = '#a1a1aa';
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            padding: '4px 8px',
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            color: '#a1a1aa',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3f3f46';
            e.currentTarget.style.color = '#e4e4e7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#27272a';
            e.currentTarget.style.color = '#a1a1aa';
          }}
        >
          -
        </button>
        <button
          onClick={handleResetZoom}
          style={{
            padding: '4px 8px',
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            color: '#a1a1aa',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3f3f46';
            e.currentTarget.style.color = '#e4e4e7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#27272a';
            e.currentTarget.style.color = '#a1a1aa';
          }}
        >
          <Maximize2 size={12} />
        </button>
      </div>
    </div>
  );
}
