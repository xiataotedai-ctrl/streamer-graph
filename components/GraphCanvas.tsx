'use client';

import { useEffect, useRef } from 'react';
import { GraphData } from '@/lib/types';
import { createGraph, toG6Data } from '@/lib/graph-setup';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string | null) => void;
  onEdgeClick?: (edgeId: string | null) => void;
  onCanvasClick?: () => void;
  highlightedNodes?: Set<string>;
  onEdgeCreate?: (source: string, target: string, position: { x: number; y: number }) => void;
}

export default function GraphCanvas({ data, onNodeClick, onEdgeClick, onCanvasClick, highlightedNodes, onEdgeCreate }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const dataRef = useRef<GraphData>(data);
  const highlightedRef = useRef<Set<string> | undefined>(highlightedNodes);

  // Keep refs in sync
  dataRef.current = data;
  highlightedRef.current = highlightedNodes;

  // Initialize graph once
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = createGraph(containerRef.current);
    graphRef.current = graph;

    const g6Data = toG6Data(dataRef.current);
    graph.setData(g6Data);
    graph.render();

    // Bind events
    if (onNodeClick) {
      graph.on('node:click', (evt: any) => {
        const nodeId = evt.target?.id || evt.itemId || null;
        onNodeClick(nodeId);
      });
    }
    if (onEdgeClick) {
      graph.on('edge:click', (evt: any) => {
        const edgeId = evt.target?.id || evt.itemId || null;
        onEdgeClick(edgeId);
      });
    }
    if (onCanvasClick) {
      graph.on('canvas:click', () => {
        onCanvasClick();
      });
    }

    // Edge creation via create-edge behavior
    if (onEdgeCreate) {
      graph.on('aftercreateedge', (evt: any) => {
        const edgeData = evt?.edge || evt?.data;
        if (edgeData) {
          const source = typeof edgeData.source === 'string' ? edgeData.source : edgeData.source?.id;
          const target = typeof edgeData.target === 'string' ? edgeData.target : edgeData.target?.id;
          if (source && target) {
            // Get the drop position for the type selector popup
            const clientPos = evt?.client || evt?.canvas;
            onEdgeCreate(source, target, { x: clientPos?.x || 0, y: clientPos?.y || 0 });
          }
        }
      });
    }

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data when it changes
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const g6Data = toG6Data(data);
    graph.setData(g6Data);
    graph.render();
  }, [data]);

  // Handle highlight/dim
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !highlightedNodes) return;

    const allNodeIds = data.nodes.map(n => n.id);
    const allEdgeIds = data.edges.map(e => e.id);

    if (highlightedNodes.size === 0) {
      // Clear all states
      const stateMap: Record<string, string[]> = {};
      allNodeIds.forEach(id => { stateMap[id] = []; });
      allEdgeIds.forEach(id => { stateMap[id] = []; });
      graph.setElementState(stateMap);
    } else {
      const stateMap: Record<string, string[]> = {};
      allNodeIds.forEach(id => {
        stateMap[id] = highlightedNodes.has(id) ? ['highlight'] : ['dim'];
      });
      allEdgeIds.forEach(id => {
        const edge = data.edges.find(e => e.id === id);
        const bothHighlighted = edge && highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target);
        stateMap[id] = bothHighlighted ? ['highlight'] : ['dim'];
      });
      graph.setElementState(stateMap);
    }
  }, [highlightedNodes, data]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0f0f1a' }}
    />
  );
}
