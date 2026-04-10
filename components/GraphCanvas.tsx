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
  onCanvasDblClick?: (x: number, y: number) => void;
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void;
  onNodeContextMenu?: (nodeId: string, x: number, y: number) => void;
  onNodeHover?: (nodeId: string | null, x: number, y: number) => void;
  highlightedNodes?: Set<string>;
  connectMode?: boolean;
  connectSource?: string | null;
  sizeMode?: 'manual' | 'auto';
  showAnnotations?: boolean;
  annotationFields?: string[];
  hiddenNodeIds?: Set<string>;
  selectedNodeId?: string | null;
}

export default function GraphCanvas({ data, onNodeClick, onNodeDblClick, onEdgeClick, onCanvasClick, onCanvasDblClick, onNodeDragEnd, onNodeContextMenu, onNodeHover, highlightedNodes, connectMode, connectSource, sizeMode, showAnnotations, annotationFields, hiddenNodeIds, selectedNodeId }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const dataRef = useRef<GraphData>(data);
  const callbacksRef = useRef({ onNodeClick, onNodeDblClick, onEdgeClick, onCanvasClick, onCanvasDblClick, onNodeDragEnd, onNodeContextMenu, onNodeHover });
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [graphReady, setGraphReady] = useState(false);
  const mountedRef = useRef(false);

  dataRef.current = data;
  callbacksRef.current = { onNodeClick, onNodeDblClick, onEdgeClick, onCanvasClick, onCanvasDblClick, onNodeDragEnd, onNodeContextMenu, onNodeHover };

  const readPosition = (graph: any, id: string): { x: number; y: number } | null => {
    try { const p = graph.getElementPosition(id); if (p?.x !== undefined) return { x: p.x, y: p.y }; } catch {}
    try { const el = graph.getElement(id); if (el) { const p = el.getPosition?.(); if (p?.x !== undefined) return { x: p.x, y: p.y }; } } catch {}
    try { const nd = graph.getNodeData([id]); if (nd?.[0]) { const x = nd[0].style?.x ?? nd[0].x; const y = nd[0].style?.y ?? nd[0].y; if (x !== undefined) return { x, y }; } } catch {}
    return null;
  };

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
    graph.on('canvas:dblclick', (evt: any) => {
      if (callbacksRef.current.onCanvasDblClick) {
        callbacksRef.current.onCanvasDblClick(evt?.client?.x ?? 0, evt?.client?.y ?? 0);
      }
    });
    graph.on('node:dragend', (evt: any) => {
      const id = evt?.target?.id;
      if (id) {
        const pos = readPosition(graph, id);
        if (pos) {
          positionsRef.current = { ...positionsRef.current, [id]: pos };
          saveGraphPositions(positionsRef.current);
        }
        if (callbacksRef.current.onNodeDragEnd) callbacksRef.current.onNodeDragEnd(id, pos?.x ?? 0, pos?.y ?? 0);
      }
    });
    graph.on('node:contextmenu', (evt: any) => {
      evt?.preventDefault?.();
      const id = evt?.target?.id;
      if (id && callbacksRef.current.onNodeContextMenu) {
        callbacksRef.current.onNodeContextMenu(id, evt?.client?.x ?? 0, evt?.client?.y ?? 0);
      }
    });
    graph.on('node:mouseenter', (evt: any) => {
      const id = evt?.target?.id;
      if (id && callbacksRef.current.onNodeHover) {
        callbacksRef.current.onNodeHover(id, evt?.client?.x ?? 0, evt?.client?.y ?? 0);
      }
    });
    graph.on('node:mouseleave', () => {
      if (callbacksRef.current.onNodeHover) callbacksRef.current.onNodeHover(null, 0, 0);
    });
  };

  const buildGraph = (el: HTMLElement, skipLayout: boolean) => {
    if (graphRef.current) {
      setGraphReady(false);
      graphRef.current.destroy();
    }
    const graph = createGraph(el, skipLayout);
    graphRef.current = graph;
    const g6Data = toG6Data(dataRef.current, sizeMode, positionsRef.current, showAnnotations, annotationFields);
    graph.setData(g6Data);
    bindEvents(graph);
    graph.render().then(() => { setGraphReady(true); }).catch(() => {});
  };

  const handleSaveLayout = (): number => {
    const graph = graphRef.current;
    if (!graph) return 0;
    const count = savePositions(graph);
    if (count === 0) return 0;
    if (containerRef.current) buildGraph(containerRef.current, true);
    return count;
  };

  useEffect(() => {
    (window as any).__g6SaveLayout = handleSaveLayout;
    (window as any).__g6Graph = graphRef.current;
    return () => { (window as any).__g6SaveLayout = undefined; (window as any).__g6Graph = undefined; };
  });

  useEffect(() => { (window as any).__g6Graph = graphRef.current; }, [graphReady]);

  // Initial mount
  useEffect(() => {
    if (!containerRef.current || mountedRef.current || data.nodes.length === 0) return;
    mountedRef.current = true;
    const saved = loadGraphPositions();
    positionsRef.current = saved;
    // Skip layout if MOST nodes have positions (not all — new nodes get placed by force)
    const nodesWithPos = data.nodes.filter(n => saved[n.id]).length;
    const skipLayout = nodesWithPos >= data.nodes.length * 0.7;
    buildGraph(containerRef.current, skipLayout);
  }, [data]);

  useEffect(() => {
    return () => { if (graphRef.current) { graphRef.current.destroy(); graphRef.current = null; } };
  }, []);

  // Data changes: save positions, rebuild
  useEffect(() => {
    if (!mountedRef.current || !containerRef.current) return;
    if (graphRef.current) savePositions(graphRef.current);
    const saved = loadGraphPositions();
    positionsRef.current = saved;
    // If most nodes have positions, skip layout (new nodes keep existing layout stable)
    const nodesWithPos = data.nodes.filter(n => saved[n.id]).length;
    const skipLayout = nodesWithPos >= data.nodes.length * 0.5;
    buildGraph(containerRef.current, skipLayout);
  }, [data, sizeMode, showAnnotations, annotationFields]);

  // Selection state
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReady) return;
    try {
      const stateMap: Record<string, string[]> = {};
      data.nodes.forEach(n => { stateMap[n.id] = selectedNodeId === n.id ? ['selected'] : []; });
      graph.setElementState(stateMap);
    } catch {}
  }, [selectedNodeId, data.nodes, graphReady]);

  // Connect mode visual
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReady) return;
    if (!connectMode || !connectSource) {
      try {
        const stateMap: Record<string, string[]> = {};
        data.nodes.forEach(n => { stateMap[n.id] = selectedNodeId === n.id ? ['selected'] : []; });
        graph.setElementState(stateMap);
      } catch {}
      return;
    }
    try {
      const stateMap: Record<string, string[]> = {};
      data.nodes.forEach(n => {
        if (n.id === connectSource) stateMap[n.id] = ['selected'];
        else stateMap[n.id] = [];
      });
      graph.setElementState(stateMap);
    } catch {}
  }, [connectMode, connectSource, data.nodes, graphReady, selectedNodeId]);

  // Highlight/dim from filter
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !highlightedNodes || !graphReady) return;
    try {
      const allNodeIds = data.nodes.map(n => n.id);
      const allEdgeIds = data.edges.map(e => e.id);
      if (highlightedNodes.size === 0) {
        const stateMap: Record<string, string[]> = {};
        allNodeIds.forEach(id => { stateMap[id] = selectedNodeId === id ? ['selected'] : []; });
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
    } catch (err) { console.warn('setState failed:', err); }
  }, [highlightedNodes, data, graphReady, selectedNodeId]);

  // Hidden nodes
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphReady) return;
    if (!hiddenNodeIds || hiddenNodeIds.size === 0) return;
    try {
      const stateMap: Record<string, string[]> = {};
      data.nodes.forEach(n => { stateMap[n.id] = hiddenNodeIds.has(n.id) ? ['dim'] : []; });
      data.edges.forEach(e => { stateMap[e.id] = hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target) ? ['dim'] : []; });
      graph.setElementState(stateMap);
    } catch {}
  }, [hiddenNodeIds, data.nodes, data.edges, graphReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0f0f1a', minHeight: '100%' }}
      onContextMenu={e => e.preventDefault()}
    />
  );
}
