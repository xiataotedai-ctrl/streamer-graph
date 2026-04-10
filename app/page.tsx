'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import NodeForm from '@/components/NodeForm';
import EdgeTypeSelector from '@/components/EdgeTypeSelector';
import EdgeEditForm from '@/components/EdgeEditForm';
import GroupForm from '@/components/GroupForm';
import TagFilterSidebar from '@/components/TagFilterSidebar';
import SubgraphPanel from '@/components/SubgraphPanel';
import { GraphData, StreamerNode, StreamerGroup, RelationshipEdge, RelationshipType, FilterState } from '@/lib/types';
import { createEmptyGraph, addNode, updateNode, removeNode, addEdge, updateEdge, removeEdge, addGroup, updateGroup, removeGroup, genId } from '@/lib/graph-data';
import { autoSave, exportJSON, importJSON } from '@/lib/storage';
import { encodeShareData } from '@/lib/share';

const EMPTY_FILTER: FilterState = { categories: [], regions: [], talents: [], sections: [], identityLevels: [], customTags: [] };

export default function Home() {
  // Start with empty graph, load from localStorage in useEffect (SSR safe)
  const [graphData, setGraphData] = useState<GraphData>(() => createEmptyGraph('圈层关系图', ''));
  const [loaded, setLoaded] = useState(false);

  // Load persisted data after mount (client-side only)
  useEffect(() => {
    try {
      // Check share link first
      const params = new URLSearchParams(window.location.search);
      const shareData = params.get('share');
      if (shareData) {
        const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
        if (decoded?.nodes) {
          setGraphData(decoded);
          setLoaded(true);
          return;
        }
      }
      // Load from localStorage
      const saved = localStorage.getItem('streamer-graph-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.nodes && parsed.nodes.length > 0) {
          setGraphData(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load saved data:', e);
    }
    setLoaded(true);
  }, []);

  const [filter, setFilter] = useState<FilterState>({ ...EMPTY_FILTER });
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState<StreamerNode | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StreamerGroup | null>(null);
  const [sizeMode, setSizeMode] = useState<'manual' | 'auto'>('manual');
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationFields, setAnnotationFields] = useState<string[]>(['categories']);

  // Connect mode
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [edgeSelectorOpen, setEdgeSelectorOpen] = useState(false);
  const [edgeSelectorPos, setEdgeSelectorPos] = useState({ x: 0, y: 0 });
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  // Edge editing
  const [editingEdge, setEditingEdge] = useState<RelationshipEdge | null>(null);
  const [showEdgeEdit, setShowEdgeEdit] = useState(false);

  // Node search in sidebar
  const [nodeSearch, setNodeSearch] = useState('');
  const [layoutSaved, setLayoutSaved] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState<GraphData[]>([]);
  const [futureHistory, setFutureHistory] = useState<GraphData[]>([]);

  const [showSubgraph, setShowSubgraph] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const [isReadOnly] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('share');
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current!);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setFutureHistory(f => [...f, graphData]);
      setGraphData(last);
      autoSave(JSON.stringify(last));
      showToast('已撤销');
      return prev.slice(0, -1);
    });
  }, [graphData, showToast]);

  const handleRedo = useCallback(() => {
    setFutureHistory(prev => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      setHistory(h => [...h, graphData]);
      setGraphData(next);
      autoSave(JSON.stringify(next));
      showToast('已重做');
      return prev.slice(0, -1);
    });
  }, [graphData, showToast]);

  // Compute highlighted nodes from filter
  const highlightedNodes = useMemo(() => {
    const hasFilters = filter.categories.length > 0 || filter.regions.length > 0 ||
      filter.talents.length > 0 || filter.identityLevels.length > 0;
    if (!hasFilters) return new Set<string>();

    const matching = new Set<string>();
    graphData.nodes.forEach(node => {
      const matchCategory = filter.categories.length === 0 ||
        node.tags.categories.some(c => filter.categories.includes(c));
      const matchRegion = filter.regions.length === 0 ||
        node.tags.regions.some(r => filter.regions.includes(r));
      const matchTalent = filter.talents.length === 0 ||
        node.tags.talents.some(t => filter.talents.includes(t));
      const matchLevel = filter.identityLevels.length === 0 ||
        filter.identityLevels.includes(node.identityLevel);

      if (matchCategory && matchRegion && matchTalent && matchLevel) {
        matching.add(node.id);
      }
    });
    return matching;
  }, [filter, graphData.nodes]);

  const updateData = useCallback((newData: GraphData) => {
    setGraphData(prev => {
      // Push previous state to history (limit 30)
      setHistory(h => [...h.slice(-29), prev]);
      setFutureHistory([]); // Clear redo stack on new change
      autoSave(JSON.stringify(newData));
      return newData;
    });
  }, []);

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Shift+Z redo, Delete node, Esc cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }
      if (e.key === 'Escape') {
        if (contextMenu) { setContextMenu(null); return; }
        if (connectMode) { setConnectMode(false); setConnectSource(null); return; }
        if (showNodeForm) { setShowNodeForm(false); setEditingNode(null); return; }
        if (showGroupForm) { setShowGroupForm(false); setEditingGroup(null); return; }
        if (showEdgeEdit) { setShowEdgeEdit(false); setEditingEdge(null); return; }
        if (selectedNodeId) { setSelectedNodeId(null); return; }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !isReadOnly) {
        e.preventDefault();
        const node = graphData.nodes.find(n => n.id === selectedNodeId);
        if (node) {
          updateData(removeNode(graphData, selectedNodeId));
          showToast(`已删除 ${node.name}`);
          setSelectedNodeId(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, selectedNodeId, connectMode, contextMenu, showNodeForm, showGroupForm, showEdgeEdit, graphData, updateData, isReadOnly, showToast]);

  // --- Node handlers ---
  const handleNodeSave = useCallback((node: StreamerNode) => {
    const existing = graphData.nodes.find(n => n.id === node.id);
    const newData = existing
      ? updateNode(graphData, node.id, node)
      : addNode(graphData, node);
    updateData(newData);
  }, [graphData, updateData]);

  const handleNodeClick = useCallback((nodeId: string | null) => {
    if (!nodeId) return;
    setSelectedNodeId(nodeId);
    setContextMenu(null);

    // Connect mode
    if (connectMode) {
      if (!connectSource) {
        setConnectSource(nodeId);
        showToast('已选择起点，请点击目标主播');
      } else if (nodeId !== connectSource) {
        setPendingTarget(nodeId);
        setEdgeSelectorPos({ x: window.innerWidth / 2 - 70, y: window.innerHeight / 2 - 100 });
        setEdgeSelectorOpen(true);
      }
    }
  }, [connectMode, connectSource, showToast]);

  const handleNodeDblClick = useCallback((nodeId: string | null) => {
    if (!nodeId || isReadOnly) return;
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      setShowNodeForm(true);
    }
  }, [graphData, isReadOnly]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    updateData(removeNode(graphData, nodeId));
    setShowNodeForm(false);
    setEditingNode(null);
  }, [graphData, updateData]);

  // --- Edge handlers ---
  const handleEdgeTypeSelect = useCallback((type: RelationshipType) => {
    if (!connectSource || !pendingTarget) return;
    const edge = {
      id: genId(),
      source: connectSource,
      target: pendingTarget,
      type,
    };
    updateData(addEdge(graphData, edge));
    setEdgeSelectorOpen(false);
    setConnectSource(null);
    setPendingTarget(null);
    showToast('关系已建立');
  }, [connectSource, pendingTarget, graphData, updateData, showToast]);

  const handleEdgeClick = useCallback((edgeId: string | null) => {
    if (!edgeId || isReadOnly || connectMode) return;
    const edge = graphData.edges.find(e => e.id === edgeId);
    if (edge) {
      setEditingEdge(edge);
      setShowEdgeEdit(true);
    }
  }, [graphData, isReadOnly, connectMode]);

  const handleEdgeSave = useCallback((edge: RelationshipEdge) => {
    updateData(updateEdge(graphData, edge.id, edge));
  }, [graphData, updateData]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    updateData(removeEdge(graphData, edgeId));
  }, [graphData, updateData]);

  // --- Group handlers ---
  const handleGroupSave = useCallback((group: StreamerGroup) => {
    let newData: GraphData;
    const existing = graphData.groups.find(g => g.id === group.id);
    if (existing) {
      newData = updateGroup(graphData, group.id, group);
    } else {
      newData = addGroup(graphData, group);
    }
    const updatedNodes = newData.nodes.map(node => {
      const isInGroup = group.memberIds.includes(node.id);
      const currentGroupIds = node.groupIds || [];
      if (isInGroup && !currentGroupIds.includes(group.id)) {
        return { ...node, groupIds: [...currentGroupIds, group.id] };
      }
      if (!isInGroup && currentGroupIds.includes(group.id)) {
        return { ...node, groupIds: currentGroupIds.filter(id => id !== group.id) };
      }
      return node;
    });
    newData = { ...newData, nodes: updatedNodes };
    updateData(newData);
  }, [graphData, updateData]);

  const handleDeleteGroup = useCallback((groupId: string) => {
    const group = graphData.groups.find(g => g.id === groupId);
    if (!group) return;
    const updatedNodes = graphData.nodes.map(node => ({
      ...node,
      groupIds: (node.groupIds || []).filter(id => id !== groupId),
      groupId: node.groupId === groupId ? undefined : node.groupId,
    }));
    const newData = removeGroup({ ...graphData, nodes: updatedNodes }, groupId);
    updateData(newData);
    setShowGroupForm(false);
    setEditingGroup(null);
  }, [graphData, updateData]);

  const handleCanvasClick = useCallback(() => {
    if (connectMode) {
      setConnectSource(null);
    }
    setSelectedNodeId(null);
    setContextMenu(null);
    setHoverInfo(null);
  }, [connectMode]);

  // --- Drag to combo: detect if node dropped inside a combo circle ---
  const handleNodeDragEnd = useCallback((nodeId: string, _x: number, _y: number) => {
    if (isReadOnly) return;
    // Use saved positions to check combo membership
    const saved = JSON.parse(localStorage.getItem('streamer-graph-positions') || '{}');
    const nodePos = saved[nodeId];
    if (!nodePos) return;

    for (const group of graphData.groups) {
      if (group.memberIds.length === 0) continue;
      // Calculate combo center from current member positions
      const memberPts = group.memberIds.map(id => saved[id]).filter(Boolean);
      if (memberPts.length === 0) continue;
      const pad = 70;
      const xs = memberPts.map(p => p.x);
      const ys = memberPts.map(p => p.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const rw = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, 120) / 2;
      const rh = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, 120) / 2;

      // Check if node is inside the ellipse
      const dx = (nodePos.x - cx) / rw;
      const dy = (nodePos.y - cy) / rh;
      if (dx * dx + dy * dy <= 1) {
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (!node) continue;
        const currentGroupIds = node.groupIds || [];
        if (currentGroupIds.includes(group.id)) continue;

        const updatedGroup = { ...group, memberIds: [...group.memberIds, nodeId] };
        let newData = updateGroup(graphData, group.id, updatedGroup);
        const updatedNodes = newData.nodes.map(n =>
          n.id === nodeId ? { ...n, groupIds: [...(n.groupIds || []), group.id] } : n
        );
        newData = { ...newData, nodes: updatedNodes };
        updateData(newData);
        showToast(`${node.name} 已加入 ${group.name}`);
        return;
      }
    }
  }, [graphData, updateData, isReadOnly, showToast]);

  // --- Right-click context menu (on node) ---
  const handleContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    if (isReadOnly) return;
    setSelectedNodeId(nodeId);
    setContextMenu({ nodeId, x, y });
  }, [isReadOnly]);

  // --- Right-click context menu (on canvas blank) ---
  const handleCanvasContextMenu = useCallback((x: number, y: number) => {
    if (isReadOnly) return;
    setContextMenu({ nodeId: '__canvas__', x, y });
  }, [isReadOnly]);

  // --- Hover info ---
  const handleHover = useCallback((nodeId: string | null, x: number, y: number) => {
    if (!nodeId) { setHoverInfo(null); return; }
    setHoverInfo({ nodeId, x, y });
  }, []);

  // --- Double-click blank to create node ---
  const handleCanvasDblClick = useCallback((_x: number, _y: number) => {
    if (isReadOnly || connectMode) return;
    setEditingNode(null);
    setShowNodeForm(true);
  }, [isReadOnly, connectMode]);

  // --- Import/Export/Share ---
  const handleExport = useCallback(() => {
    const filename = `${graphData.metadata.name || 'streamer-graph'}-${new Date().toISOString().slice(0, 10)}.json`;
    exportJSON(graphData, filename);
    showToast('已导出 JSON 文件');
  }, [graphData, showToast]);

  const handleImport = useCallback(async () => {
    try {
      const json = await importJSON();
      const data = JSON.parse(json);
      if (data?.nodes) {
        updateData(data);
        showToast(`已导入 ${data.nodes.length} 位主播`);
      } else {
        showToast('文件格式不正确');
      }
    } catch {
      showToast('导入失败');
    }
  }, [updateData, showToast]);

  const handleShare = useCallback(() => {
    const encoded = encodeShareData(graphData);
    if (!encoded) {
      showToast('分享失败：数据过大');
      return;
    }
    const url = `${window.location.origin}?share=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('分享链接已复制到剪贴板');
    }).catch(() => {
      prompt('复制以下链接：', url);
    });
  }, [graphData, showToast]);

  const handleExportImage = useCallback(async (mode: 'all' | 'visible') => {
    const graph = (window as any).__g6Graph;
    if (!graph) {
      showToast('图表未就绪');
      return;
    }
    setExportMenuOpen(false);
    try {
      if (mode === 'visible') {
        const visibleIds = new Set(
          graphData.nodes
            .filter(n => !hiddenNodeIds.has(n.id))
            .map(n => n.id)
        );
        const stateMap: Record<string, string[]> = {};
        graphData.nodes.forEach(n => {
          stateMap[n.id] = visibleIds.has(n.id) ? [] : ['dim'];
        });
        graphData.edges.forEach(e => {
          const bothVisible = visibleIds.has(e.source) && visibleIds.has(e.target);
          stateMap[e.id] = bothVisible ? [] : ['dim'];
        });
        graph.setElementState(stateMap);

        // Wait for G6 to render the state change
        await new Promise(r => setTimeout(r, 500));
        const dataURL: string = await graph.toDataURL({ type: 'image/png', mode: 'overall' });
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `${graphData.metadata.name || 'streamer-graph'}-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        showToast(`已导出可见节点 (${visibleIds.size} 人)`);
      } else {
        const stateMap: Record<string, string[]> = {};
        graphData.nodes.forEach(n => { stateMap[n.id] = []; });
        graphData.edges.forEach(e => { stateMap[e.id] = []; });
        graph.setElementState(stateMap);

        await new Promise(r => setTimeout(r, 500));
        const dataURL: string = await graph.toDataURL({ type: 'image/png', mode: 'overall' });
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `${graphData.metadata.name || 'streamer-graph'}-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        showToast(`已导出全部节点 (${graphData.nodes.length} 人)`);
      }
    } catch (e) {
      console.error('Export failed:', e);
      showToast('导出失败');
    }
  }, [graphData, hiddenNodeIds, showToast]);

  const handleExportSubgraph = useCallback((data: GraphData) => {
    const filename = `subgraph-${new Date().toISOString().slice(0, 10)}.json`;
    exportJSON(data, filename);
    showToast(`已导出 ${data.nodes.length} 位主播的子图`);
  }, [showToast]);

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      {/* Mobile hamburger */}
      {!isReadOnly && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-3 left-3 z-40 md:hidden bg-[#1a1a2e] rounded-lg p-2 text-gray-400 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      )}

      {/* Left Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-200 bg-[#1a1a2e] border-r border-gray-800 overflow-y-auto flex-shrink-0 ${!sidebarOpen ? 'hidden md:block md:w-64' : ''}`}>
        <TagFilterSidebar data={graphData} filter={filter} onFilterChange={setFilter} />

        {/* Node list with search + edit buttons */}
        {graphData.nodes.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs text-gray-500">主播管理 ({graphData.nodes.length})</h3>
            </div>
            {graphData.nodes.length > 8 && (
              <input
                value={nodeSearch}
                onChange={e => setNodeSearch(e.target.value)}
                placeholder="搜索主播..."
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-xs mb-2 focus:outline-none focus:border-blue-500"
              />
            )}
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {graphData.nodes
                .filter(n => !nodeSearch || n.name.includes(nodeSearch))
                .map(node => {
                  const isHidden = hiddenNodeIds.has(node.id);
                  return (
                  <div key={node.id} className={`flex items-center justify-between text-xs rounded px-2 py-1.5 hover:bg-white/5 ${isHidden ? 'opacity-40' : ''}`}>
                    <span className="text-gray-400 truncate mr-2">{node.name}</span>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => {
                          setHiddenNodeIds(prev => {
                            const next = new Set(prev);
                            if (next.has(node.id)) next.delete(node.id);
                            else next.add(node.id);
                            return next;
                          });
                        }}
                          className={`text-[10px] flex-shrink-0 ${isHidden ? 'text-gray-600 hover:text-gray-400' : 'text-green-500 hover:text-green-400'}`}
                          title={isHidden ? '显示节点' : '隐藏节点'}>
                          {isHidden ? '◉' : '◎'}
                        </button>
                        <button onClick={() => { setEditingNode(node); setShowNodeForm(true); }}
                          className="text-blue-400 hover:text-blue-300 text-[10px] flex-shrink-0">
                          编辑
                        </button>
                      </div>
                    )}
                </div>
                );
                })}
            </div>
          </div>
        )}

        {/* Group list with edit buttons */}
        {graphData.groups.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-800 pt-3">
            <h3 className="text-xs text-gray-500 mb-2">圈层管理</h3>
            <div className="space-y-1">
              {graphData.groups.map(group => (
                <div key={group.id} className="flex items-center justify-between text-xs rounded px-2 py-1.5 hover:bg-white/5">
                  <span className="text-gray-400">{group.name} ({group.memberIds.length})</span>
                  {!isReadOnly && (
                    <button onClick={() => { setEditingGroup(group); setShowGroupForm(true); }}
                      className="text-blue-400 hover:text-blue-300 text-[10px]">
                      编辑
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <GraphCanvas
          data={graphData}
          onNodeClick={handleNodeClick}
          onNodeDblClick={handleNodeDblClick}
          onEdgeClick={handleEdgeClick}
          onCanvasClick={handleCanvasClick}
          highlightedNodes={highlightedNodes}
          connectMode={connectMode}
          connectSource={connectSource}
          sizeMode={sizeMode}
          showAnnotations={showAnnotations}
          annotationFields={annotationFields}
          hiddenNodeIds={hiddenNodeIds}
          onNodeDragEnd={handleNodeDragEnd}
          onNodeContextMenu={handleContextMenu}
          onNodeHover={handleHover}
          onCanvasDblClick={handleCanvasDblClick}
          onCanvasContextMenu={handleCanvasContextMenu}
          selectedNodeId={selectedNodeId}
        />

        {/* Top Toolbar */}
        {!isReadOnly && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <div className="pointer-events-auto bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-3 py-2 flex gap-2 flex-wrap">
              <button onClick={() => { setEditingNode(null); setShowNodeForm(true); }}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                + 添加主播
              </button>
              <button onClick={() => { setEditingGroup(null); setShowGroupForm(true); }}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                + 创建圈层
              </button>
              <button onClick={() => {
                setConnectMode(!connectMode);
                setConnectSource(null);
                if (!connectMode) showToast('连接模式：先点起点主播，再点目标主播');
              }}
                className={`text-xs px-3 py-1.5 rounded ${connectMode ? 'bg-green-600 text-white' : 'text-gray-300 bg-[#16213e] hover:text-white'}`}>
                {connectMode ? '连接中...' : '建立关系'}
              </button>
              <button onClick={() => setSizeMode(m => m === 'manual' ? 'auto' : 'manual')}
                className={`text-xs px-3 py-1.5 rounded ${sizeMode === 'auto' ? 'bg-blue-600 text-white' : 'text-gray-300 bg-[#16213e] hover:text-white'}`}>
                节点大小: {sizeMode === 'auto' ? '按关系数量' : '按身份等级'}
              </button>
              <div className="relative">
                <button onClick={() => setShowAnnotations(!showAnnotations)}
                  className={`text-xs px-3 py-1.5 rounded ${showAnnotations ? 'bg-green-600 text-white' : 'text-gray-300 bg-[#16213e] hover:text-white'}`}>
                  {showAnnotations ? '标注 ✓' : '标注'}
                </button>
                {showAnnotations && (
                  <div className="absolute top-9 left-0 bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 z-30 w-32">
                    {[
                      { key: 'categories', label: '品类' },
                      { key: 'regions', label: '地域' },
                      { key: 'talents', label: '才艺' },
                      { key: 'sections', label: '板块' },
                      { key: 'notes', label: '备注' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white py-1 cursor-pointer">
                        <input type="checkbox" checked={annotationFields.includes(key)}
                          onChange={() => setAnnotationFields(prev =>
                            prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
                          )}
                          className="accent-green-500" />
                        {label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 ml-1">
                <button onClick={() => {
                  const saveLayout = (window as any).__g6SaveLayout;
                  if (saveLayout) {
                    const count = saveLayout();
                    if (count > 0) {
                      setLayoutSaved(true);
                      showToast(`布局已保存 (${count} 个节点)，刷新后位置将恢复`);
                      setTimeout(() => setLayoutSaved(false), 3000);
                    } else {
                      showToast('保存失败：无法读取节点位置');
                    }
                  } else {
                    showToast('图表未就绪');
                  }
                }}
                  className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                    layoutSaved
                      ? 'bg-green-600 text-white'
                      : 'bg-amber-700 text-white hover:bg-amber-600'
                  }`}
                  title="拖动节点后点击保存，布局将在刷新后恢复">
                  {layoutSaved ? '✅ 已保存' : '📌 保存布局'}
                </button>
                <button onClick={handleUndo} disabled={history.length === 0}
                  className="text-xs px-2 py-1.5 bg-[#16213e] rounded text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="撤销 (Ctrl+Z)">
                  ↩ 撤销
                </button>
                <button onClick={handleRedo} disabled={futureHistory.length === 0}
                  className="text-xs px-2 py-1.5 bg-[#16213e] rounded text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="重做 (Ctrl+Shift+Z)">
                  ↪ 重做
                </button>
              </div>
            </div>
            <div className="pointer-events-auto bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-3 py-2 flex gap-2 flex-wrap">
              <button onClick={handleExport}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                导出
              </button>
              <button onClick={handleImport}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                导入
              </button>
              <button onClick={handleShare}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                分享链接
              </button>
              <div className="relative">
                <button onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                  导出图片 ▾
                </button>
                {exportMenuOpen && (
                  <div className="absolute top-9 right-0 bg-[#1a1a2e] border border-gray-700 rounded-lg py-1 z-30 w-36">
                    <button onClick={() => handleExportImage('visible')}
                      className="w-full text-left text-xs text-gray-400 hover:text-white hover:bg-white/5 px-3 py-2">
                      导出可见节点
                    </button>
                    <button onClick={() => handleExportImage('all')}
                      className="w-full text-left text-xs text-gray-400 hover:text-white hover:bg-white/5 px-3 py-2">
                      导出全部
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connect mode banner */}
        {connectMode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-green-900/80 backdrop-blur rounded-lg px-4 py-2 text-xs text-green-300 z-20">
            {connectSource
              ? `已选起点，点击目标主播建立关系（点击空白取消）`
              : `点击第一个主播作为起点`}
          </div>
        )}

        {/* Share banner */}
        {isReadOnly && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-4 py-2 text-xs text-gray-400">
            这是分享的只读视图
          </div>
        )}

        {/* Stats + shortcuts */}
        <div className="absolute bottom-4 left-4 bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-500 space-y-1 pointer-events-none">
          <div>
            {graphData.nodes.length} 位主播 · {graphData.edges.length} 条关系 · {graphData.groups.length} 个圈层
            {highlightedNodes.size > 0 && ` · 筛选出 ${highlightedNodes.size} 人`}
            {selectedNodeId && ` · 已选中 ${graphData.nodes.find(n => n.id === selectedNodeId)?.name || ''}`}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            <span className="text-gray-500">双击节点</span><span className="text-gray-400">编辑</span>
            <span className="text-gray-500">双击空白</span><span className="text-gray-400">添加主播</span>
            <span className="text-gray-500">右键节点</span><span className="text-gray-400">更多操作</span>
            <span className="text-gray-500">拖入圈层</span><span className="text-gray-400">自动加入</span>
            <span className="text-gray-500">Delete</span><span className="text-gray-400">删除选中</span>
            <span className="text-gray-500">Ctrl+Z</span><span className="text-gray-400">撤销</span>
            <span className="text-gray-500">Esc</span><span className="text-gray-400">取消操作</span>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#16213e] border border-gray-700 rounded-lg px-4 py-2 text-xs text-gray-300 shadow-lg z-40">
            {toast}
          </div>
        )}

        {/* Right-click context menu */}
        {contextMenu && !isReadOnly && (() => {
          const isCanvas = contextMenu.nodeId === '__canvas__';
          const ctxNode = isCanvas ? null : graphData.nodes.find(n => n.id === contextMenu.nodeId);

          // Canvas right-click menu
          if (isCanvas) {
            return (
              <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} onContextMenu={e => { e.preventDefault(); setContextMenu(null); }}>
                <div className="absolute bg-[#1a1a2e] border border-gray-700 rounded-lg py-1 shadow-xl min-w-[160px]"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  onClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}>
                  <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">画布操作</div>
                  <button onClick={() => { setEditingNode(null); setShowNodeForm(true); setContextMenu(null); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white">添加主播</button>
                  <button onClick={() => { setEditingGroup(null); setShowGroupForm(true); setContextMenu(null); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white">创建圈层</button>
                  <button onClick={() => { setConnectMode(true); setConnectSource(null); setContextMenu(null); showToast('连接模式：先点起点，再点目标'); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white">建立关系</button>
                </div>
              </div>
            );
          }

          // Node right-click menu
          if (!ctxNode) return null;
          const nodeGroups = graphData.groups.filter(g => g.memberIds.includes(ctxNode.id));
          return (
            <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} onContextMenu={e => { e.preventDefault(); setContextMenu(null); }}>
              <div className="absolute bg-[#1a1a2e] border border-gray-700 rounded-lg py-1 shadow-xl min-w-[160px]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}>
                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-800">{ctxNode.name}</div>
                <button onClick={() => { setEditingNode(ctxNode); setShowNodeForm(true); setContextMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white">编辑</button>
                <button onClick={() => { setEditingNode(ctxNode); setShowNodeForm(true); setContextMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white">修改标注</button>
                {nodeGroups.length > 0 && nodeGroups.map(g => (
                  <button key={g.id} onClick={() => {
                    const updatedMembers = g.memberIds.filter(id => id !== ctxNode.id);
                    let newData = updateGroup(graphData, g.id, { ...g, memberIds: updatedMembers });
                    const updatedNodes = newData.nodes.map(n =>
                      n.id === ctxNode.id ? { ...n, groupIds: (n.groupIds || []).filter(id => id !== g.id) } : n
                    );
                    newData = { ...newData, nodes: updatedNodes };
                    updateData(newData);
                    showToast(`${ctxNode.name} 已移出 ${g.name}`);
                    setContextMenu(null);
                  }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-white">移出「{g.name}」</button>
                ))}
                <div className="border-t border-gray-800 mt-1 pt-1">
                  <button onClick={() => {
                    updateData(removeNode(graphData, ctxNode.id));
                    showToast(`已删除 ${ctxNode.name}`);
                    setContextMenu(null);
                    setSelectedNodeId(null);
                  }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20">删除</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Hover info card */}
        {hoverInfo && (() => {
          const hNode = graphData.nodes.find(n => n.id === hoverInfo.nodeId);
          if (!hNode) return null;
          return (
            <div className="fixed bg-[#1a1a2e]/95 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl z-40 pointer-events-none max-w-[220px]"
              style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}>
              <div className="font-bold text-gray-200 mb-1">{hNode.name}</div>
              <div className="text-gray-500 space-y-0.5">
                {hNode.platforms.length > 0 && <div>平台：{hNode.platforms.join('、')}</div>}
                {hNode.tags.categories.length > 0 && <div>品类：{hNode.tags.categories.join('、')}</div>}
                {hNode.tags.regions.length > 0 && <div>地域：{hNode.tags.regions.join('、')}</div>}
                {hNode.tags.talents.length > 0 && <div>才艺：{hNode.tags.talents.join('、')}</div>}
                {hNode.notes && <div className="text-gray-400">备注：{hNode.notes}</div>}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Subgraph Panel */}
      <SubgraphPanel
        open={showSubgraph}
        onClose={() => setShowSubgraph(false)}
        selectedNodeIds={selectedNodeIds}
        fullData={graphData}
        onExportSubgraph={handleExportSubgraph}
      />

      {/* Node Form Modal */}
      <NodeForm
        open={showNodeForm}
        onClose={() => { setShowNodeForm(false); setEditingNode(null); }}
        onSave={handleNodeSave}
        onDelete={editingNode ? () => handleDeleteNode(editingNode.id) : undefined}
        initialData={editingNode}
      />

      {/* Group Form Modal */}
      <GroupForm
        open={showGroupForm}
        onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
        onSave={handleGroupSave}
        onDelete={editingGroup ? () => handleDeleteGroup(editingGroup.id) : undefined}
        nodes={graphData.nodes}
        initialData={editingGroup}
      />

      {/* Edge Type Selector */}
      <EdgeTypeSelector
        open={edgeSelectorOpen}
        position={edgeSelectorPos}
        onSelect={handleEdgeTypeSelect}
        onCancel={() => { setEdgeSelectorOpen(false); setConnectSource(null); setPendingTarget(null); }}
      />

      {/* Edge Edit Form */}
      <EdgeEditForm
        open={showEdgeEdit}
        edge={editingEdge}
        sourceName={graphData.nodes.find(n => n.id === editingEdge?.source)?.name || ''}
        targetName={graphData.nodes.find(n => n.id === editingEdge?.target)?.name || ''}
        onSave={handleEdgeSave}
        onDelete={handleEdgeDelete}
        onClose={() => { setShowEdgeEdit(false); setEditingEdge(null); }}
      />
    </main>
  );
}
