'use client';

import { useEffect, useRef, useState } from 'react';
import { GraphData } from '@/lib/types';
import { createGraph, toG6Data } from '@/lib/graph-setup';
import { saveGraphPositions, loadGraphPositions } from '@/lib/storage';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string | null) => void;
  onNodeDblClick?: (nodeId: string | null) => void;
  onEdgeClick?: (edgeId: string | null) => void;
  onCanvasClick?: () => void;
  highlightedNodes?: Set<string>;
  connectMode?: boolean;
  connectSource?: string | null;
  sizeMode?: 'manual' | 'auto';
  showAnnotations?: boolean;
  annotationFields?: string[];
}

export default function GraphCanvas({ data, onNodeClick, onNodeDblClick, onEdgeClick, onCanvasClick, highlightedNodes, connectMode, connectSource, sizeMode, showAnnotations, annotationFields }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const dataRef = useRef<GraphData>(data);
  const callbacksRef = useRef({ onNodeClick, onNodeDblClick, onEdgeClick, onCanvasClick });
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [graphReady, setGraphReady] = useState(false);

  dataRef.current = data;
  callbacksRef.current = { onNodeClick, onNodeDblClick, onEdgeClick, onCanvasClick };

  // Try every method to read a node's position from G6
  const readPosition = (graph: any, id: string): { x: number; y: number } | null => {
    try { const p = graph.getElementPosition(id); if (p?.x !== undefined) return { x: p.x, y: p.y }; } catch {}
    try { const el = graph.getElement(id); if (el) { const p = el.getPosition?.(); if (p?.x !== undefined) return { x: p.x, y: p.y }; } } catch {}
    try { const nd = graph.getNodeData([id]); if (nd?.[0]) { const x = nd[0].style?.x ?? nd[0].x; const y = nd[0].style?.y ?? nd[0].y; if (x !== undefined) return { x, y }; } } catch {}
    return null;
  };

  // Read all node positions, save to ref + localStorage, return count
  const savePositions = (graph: any): number => {
    const positions = { ...positionsRef.current };
    let count = 0;
    for (const node of dataRef.current.nodes) {
      const pos = readPosition(graph, node.id);
      if (pos) { positions[node.id] = pos; count++; }
    }
    if (count > 0) {
      positionsRef.current = positions;
      saveGraphPositions(positions);
    }
    return count;
  };

  // Bind all interactive events on a graph instance
  const bindEvents = (graph: any) => {
    graph.on('node:click', (evt: any) => {
      const id = evt?.target?.id;
      if (id && callbacksRef.current.onNodeClick) callbacksRef.current.onNodeClick(id);
    });
    graph.on('node:dblclick', (evt: any) => {
      const id = evt?.target?.id;
      if (id && callbacksRef.current.onNodeDblClick) callbacksRef.current.onNodeDblClick(id);
    });
    graph.on('edge:click', (evt: any) => {
      const id = evt?.target?.id;
      if (id && callbacksRef.current.onEdgeClick) callbacksRef.current.onEdgeClick(id);
    });
    graph.on('canvas:click', () => {
      if (callbacksRef.current.onCanvasClick) callbacksRef.current.onCanvasClick();
    });
  };

  // Build or rebuild the graph. Called on mount and after layout save.
  const buildGraph = (el: HTMLElement, skipLayout: boolean) => {
    // Destroy previous graph if any
    if (graphRef.current) {
      setGraphReady(false);
      graphRef.current.destroy();
    }

    const graph = createGraph(el, skipLayout);
    graphRef.current = graph;

    const g6Data = toG6Data(dataRef.current, sizeMode, positionsRef.current, showAnnotations, annotationFields);
    graph.setData(g6Data);
    bindEvents(graph);

    graph.render().then(() => {
      setGraphReady(true);
    }).catch(() => {});
  };

  // Save layout function — exposed via window bridge
  const handleSaveLayout = (): number => {
    const graph = graphRef.current;
    if (!graph) return 0;

    const count = savePositions(graph);
    if (count === 0) return 0;

    // Rebuild graph WITHOUT layout so positions are locked in
    if (containerRef.current) {
      buildGraph(containerRef.current, true);
    }
    return count;
  };

  // Register bridge
  useEffect(() => {
    (window as any).__g6SaveLayout = handleSaveLayout;
    return () => { (window as any).__g6SaveLayout = undefined; };
  });

  // Expose graph instance for image export
  useEffect(() => {
    (window as any).__g6Graph = graphRef.current;
    return () => { (window as any).__g6Graph = undefined; };
  });

  // Create graph ONLY after data is loaded from localStorage (nodes > 0)
  useEffect(() => {
    if (!containerRef.current) return;
    if (graphRef.current) return; // Already created
    if (data.nodes.length === 0) return; // Wait for data

    const saved = loadGraphPositions();
    positionsRef.current = saved;

    // Skip force layout if we have saved positions for ALL nodes
    const allHavePositions = data.nodes.every(n => saved[n.id]);

    buildGraph(containerRef.current, allHavePositions);
  }, [data]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, []);

  // Update data when it changes (after graph is created)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    setGraphReady(false);
    const g6Data = toG6Data(data, sizeMode, positionsRef.current, showAnnotations, annotationFields);
    graph.setData(g6Data);
    graph.render().then(() => {
      setGraphReady(true);
    }).catch(() => {});
  }, [data, sizeMode, showAnnotations, annotationFields]);

  // Handle connect mode visual
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReady) return;
    if (!connectMode || !connectSource) {
      try {
        const stateMap: Record<string, string[]> = {};
        data.nodes.forEach(n => { stateMap[n.id] = []; });
        graph.setElementState(stateMap);
      } catch {}
      return;
    }
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
      style={{ background: '#0f0f1a', minHeight: '100%' }}
    />
  );
}
