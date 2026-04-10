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
  connectMode?: boolean;
  connectSource?: string | null;
  sizeMode?: 'manual' | 'auto';
}

export default function GraphCanvas({ data, onNodeClick, onEdgeClick, onCanvasClick, highlightedNodes, connectMode, connectSource, sizeMode }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const dataRef = useRef<GraphData>(data);
  const [graphReady, setGraphReady] = useState(false);

  // Keep ref in sync
  dataRef.current = data;

  // Initialize graph once
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = createGraph(containerRef.current);
    graphRef.current = graph;

    const g6Data = toG6Data(dataRef.current, sizeMode);
    graph.setData(g6Data);

    graph.render().then(() => {
      setGraphReady(true);
    }).catch(() => {});

    // Bind events — try multiple property paths for G6 v5 compatibility
    graph.on('node:click', (evt: any) => {
      // G6 v5 event: try itemId first, then target.id, then target.id
      const nodeId = evt?.itemId || evt?.target?.id || evt?.item?.id || evt?.id || null;
      if (onNodeClick && nodeId) onNodeClick(nodeId);
    });

    graph.on('edge:click', (evt: any) => {
      const edgeId = evt?.itemId || evt?.target?.id || evt?.item?.id || evt?.id || null;
      if (onEdgeClick && edgeId) onEdgeClick(edgeId);
    });

    graph.on('canvas:click', () => {
      if (onCanvasClick) onCanvasClick();
    });

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

  // Handle connect mode visual — highlight source node
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReady) return;
    if (!connectMode || !connectSource) {
      // Clear selected state from all nodes
      try {
        const stateMap: Record<string, string[]> = {};
        data.nodes.forEach(n => { stateMap[n.id] = []; });
        graph.setElementState(stateMap);
      } catch {}
      return;
    }
    // Highlight the connect source
    try {
      const stateMap: Record<string, string[]> = {};
      data.nodes.forEach(n => {
        stateMap[n.id] = n.id === connectSource ? ['selected'] : [];
      });
      graph.setElementState(stateMap);
    } catch {}
  }, [connectMode, connectSource, data.nodes, graphReady]);

  // Handle highlight/dim from tag filter
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !highlightedNodes || !graphReady) return;

    try {
      const allNodeIds = data.nodes.map(n => n.id);
      const allEdgeIds = data.edges.map(e => e.id);

      if (highlightedNodes.size === 0) {
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
