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
import { createEmptyGraph, addNode, updateNode, removeNode, addEdge, updateEdge, removeEdge, addGroup, updateGroup, genId } from '@/lib/graph-data';
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

  // Undo: Ctrl+Z, Redo: Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

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

    // Single click only used for connect mode
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

  const handleCanvasClick = useCallback(() => {
    if (connectMode) {
      setConnectSource(null);
    }
  }, [connectMode]);

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
                .map(node => (
                <div key={node.id} className="flex items-center justify-between text-xs rounded px-2 py-1.5 hover:bg-white/5">
                  <span className="text-gray-400 truncate mr-2">{node.name}</span>
                  {!isReadOnly && (
                    <button onClick={() => { setEditingNode(node); setShowNodeForm(true); }}
                      className="text-blue-400 hover:text-blue-300 text-[10px] flex-shrink-0">
                      编辑
                    </button>
                  )}
                </div>
              ))}
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

        {/* Stats + hints */}
        <div className="absolute bottom-4 left-4 bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-gray-500 space-y-0.5">
          <div>
            {graphData.nodes.length} 位主播 · {graphData.edges.length} 条关系 · {graphData.groups.length} 个圈层
            {highlightedNodes.size > 0 && ` · 筛选出 ${highlightedNodes.size} 人`}
          </div>
          <div className="text-[10px] text-gray-600">
            双击节点编辑 · 点击关系线编辑关系 · Ctrl+Z 撤销
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#16213e] border border-gray-700 rounded-lg px-4 py-2 text-xs text-gray-300 shadow-lg">
            {toast}
          </div>
        )}
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
