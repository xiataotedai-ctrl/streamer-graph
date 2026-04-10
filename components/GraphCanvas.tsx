'use client';

import { useEffect, useRef, useState } from 'react';
import { GraphData } from '@/lib/types';
import { createGraph, toG6Data } from '@/lib/graph-setup';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string | null) => void;
  onEdgeClick?: (edgeId: string | null) => void;
  onCanvasClick?: () => void;
  highlightedNodes?: Set<string>;
  onEdgeCreate?: (source: string, target: string, position: { x: number; y: number }) => void;
  sizeMode?: 'manual' | 'auto';
}

export default function GraphCanvas({ data, onNodeClick, onEdgeClick, onCanvasClick, highlightedNodes, onEdgeCreate, sizeMode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const dataRef = useRef<GraphData>(data);
  const highlightedRef = useRef<Set<string> | undefined>(highlightedNodes);
  const [graphReady, setGraphReady] = useState(false);

  // Keep refs in sync
  dataRef.current = data;
  highlightedRef.current = highlightedNodes;

  // Initialize graph once
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = createGraph(containerRef.current);
    graphRef.current = graph;

    const g6Data = toG6Data(dataRef.current, sizeMode);
    graph.setData(g6Data);

    // render() is async - wait for it to complete before allowing state operations
    graph.render().then(() => {
      setGraphReady(true);
    }).catch((err: any) => {
      console.warn('Graph render failed:', err);
    });

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
            const clientPos = evt?.client || evt?.canvas;
            onEdgeCreate(source, target, { x: clientPos?.x || 0, y: clientPos?.y || 0 });
          }
        }
      });
    }

    return () => {
      setGraphReady(false);
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data when it changes
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    setGraphReady(false);
    const g6Data = toG6Data(data, sizeMode);
    graph.setData(g6Data);
    graph.render().then(() => {
      setGraphReady(true);
    }).catch(() => {});
  }, [data, sizeMode]);

  // Handle highlight/dim - only after graph is ready
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !highlightedNodes || !graphReady) return;

    try {
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
    } catch (err) {
      // Silently ignore state errors during transitions
      console.warn('setState failed:', err);
    }
  }, [highlightedNodes, data, graphReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0f0f1a' }}
    />
  );
}
