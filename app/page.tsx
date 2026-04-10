'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import NodeForm from '@/components/NodeForm';
import EdgeTypeSelector from '@/components/EdgeTypeSelector';
import GroupForm from '@/components/GroupForm';
import TagFilterSidebar from '@/components/TagFilterSidebar';
import SubgraphPanel from '@/components/SubgraphPanel';
import { GraphData, StreamerNode, StreamerGroup, RelationshipType, FilterState } from '@/lib/types';
import { createEmptyGraph, addNode, updateNode, removeNode, addEdge, addGroup, updateGroup, genId, extractSubgraph } from '@/lib/graph-data';
import { autoSave, exportJSON, importJSON } from '@/lib/storage';
import { encodeShareData } from '@/lib/share';

const EMPTY_FILTER: FilterState = { categories: [], regions: [], talents: [], sections: [], identityLevels: [], customTags: [] };

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const shareData = params.get('share');
        if (shareData) {
          const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
          if (decoded?.nodes) return decoded;
        }
      } catch {}
      try {
        const saved = localStorage.getItem('streamer-graph-data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.nodes) return parsed;
        }
      } catch {}
    }
    return createEmptyGraph('圈层关系图', '');
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({ ...EMPTY_FILTER });
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState<StreamerNode | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StreamerGroup | null>(null);
  const [edgeSelectorOpen, setEdgeSelectorOpen] = useState(false);
  const [edgeSelectorPos, setEdgeSelectorPos] = useState({ x: 0, y: 0 });
  const [pendingEdge, setPendingEdge] = useState<{ source: string; target: string } | null>(null);
  const [sizeMode, setSizeMode] = useState<'manual' | 'auto'>('manual');
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

  // Auto-save on every change
  const updateData = useCallback((newData: GraphData) => {
    setGraphData(newData);
    autoSave(JSON.stringify(newData));
  }, []);

  const handleNodeSave = useCallback((node: StreamerNode) => {
    const existing = graphData.nodes.find(n => n.id === node.id);
    let newData: GraphData;
    if (existing) {
      newData = updateNode(graphData, node.id, node);
    } else {
      newData = addNode(graphData, node);
    }
    updateData(newData);
  }, [graphData, updateData]);

  const handleNodeClick = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId && !isReadOnly) {
      const node = graphData.nodes.find(n => n.id === nodeId);
      if (node) {
        setEditingNode(node);
        setShowNodeForm(true);
      }
    }
  }, [graphData, isReadOnly]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId) {
      updateData(removeNode(graphData, selectedNodeId));
      setSelectedNodeId(null);
      setEditingNode(null);
      setShowNodeForm(false);
    }
  }, [selectedNodeId, graphData, updateData]);

  const handleEdgeCreate = useCallback((source: string, target: string, position: { x: number; y: number }) => {
    setPendingEdge({ source, target });
    setEdgeSelectorPos(position);
    setEdgeSelectorOpen(true);
  }, []);

  const handleEdgeTypeSelect = useCallback((type: RelationshipType) => {
    if (!pendingEdge) return;
    const edge = {
      id: genId(),
      source: pendingEdge.source,
      target: pendingEdge.target,
      type,
    };
    updateData(addEdge(graphData, edge));
    setEdgeSelectorOpen(false);
    setPendingEdge(null);
  }, [pendingEdge, graphData, updateData]);

  const handleGroupSave = useCallback((group: StreamerGroup) => {
    let newData: GraphData;
    const existing = graphData.groups.find(g => g.id === group.id);
    if (existing) {
      newData = updateGroup(graphData, group.id, group);
    } else {
      newData = addGroup(graphData, group);
    }
    // Update member nodes' groupIds
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
      // Fallback: show in prompt
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

      {/* Left Sidebar - Tag Filters */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-200 bg-[#1a1a2e] border-r border-gray-800 overflow-y-auto flex-shrink-0 ${!sidebarOpen ? 'hidden md:block md:w-64' : ''}`}>
        <TagFilterSidebar data={graphData} filter={filter} onFilterChange={setFilter} />
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <GraphCanvas
          data={graphData}
          onNodeClick={handleNodeClick}
          onCanvasClick={() => { setSelectedNodeId(null); setEditingNode(null); }}
          highlightedNodes={highlightedNodes}
          onEdgeCreate={handleEdgeCreate}
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
              <button onClick={() => setSizeMode(m => m === 'manual' ? 'auto' : 'manual')}
                className={`text-xs px-3 py-1.5 rounded ${sizeMode === 'auto' ? 'bg-blue-600 text-white' : 'text-gray-300 bg-[#16213e] hover:text-white'}`}>
                {sizeMode === 'auto' ? '按连接数' : '按等级'}
              </button>
            </div>
            <div className="pointer-events-auto bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-3 py-2 flex gap-2 flex-wrap">
              {selectedNodeId && (
                <button onClick={handleDeleteNode}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-900/30 rounded">
                  删除
                </button>
              )}
              {selectedNodeIds.length > 1 && (
                <button onClick={() => setShowSubgraph(true)}
                  className="text-xs text-green-400 hover:text-green-300 px-3 py-1.5 bg-green-900/30 rounded">
                  子图 ({selectedNodeIds.length})
                </button>
              )}
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

        {/* Share banner */}
        {isReadOnly && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-4 py-2 text-xs text-gray-400">
            这是分享的只读视图
          </div>
        )}

        {/* Stats */}
        <div className="absolute bottom-4 left-4 bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-gray-500">
          {graphData.nodes.length} 位主播 · {graphData.edges.length} 条关系 · {graphData.groups.length} 个圈层
          {highlightedNodes.size > 0 && ` · 筛选出 ${highlightedNodes.size} 人`}
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#16213e] border border-gray-700 rounded-lg px-4 py-2 text-xs text-gray-300 shadow-lg animate-pulse">
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
        onCancel={() => { setEdgeSelectorOpen(false); setPendingEdge(null); }}
      />
    </main>
  );
}
