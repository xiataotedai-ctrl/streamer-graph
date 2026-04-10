'use client';

import { useState, useCallback } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import NodeForm from '@/components/NodeForm';
import EdgeTypeSelector from '@/components/EdgeTypeSelector';
import GroupForm from '@/components/GroupForm';
import { GraphData, StreamerNode, StreamerGroup, RelationshipType } from '@/lib/types';
import { createEmptyGraph, addNode, updateNode, removeNode, addEdge, addGroup, updateGroup, genId } from '@/lib/graph-data';
import { autoSave } from '@/lib/storage';

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
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState<StreamerNode | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StreamerGroup | null>(null);
  const [edgeSelectorOpen, setEdgeSelectorOpen] = useState(false);
  const [edgeSelectorPos, setEdgeSelectorPos] = useState({ x: 0, y: 0 });
  const [pendingEdge, setPendingEdge] = useState<{ source: string; target: string } | null>(null);
  const [isReadOnly] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('share');
  });

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

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      {/* Left Sidebar - Tag Filters */}
      <aside className="w-64 bg-[#1a1a2e] border-r border-gray-800 p-4 overflow-y-auto flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">标签筛选</h2>
        <p className="text-xs text-gray-500">筛选功能开发中...</p>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <GraphCanvas
          data={graphData}
          onNodeClick={handleNodeClick}
          onCanvasClick={() => { setSelectedNodeId(null); setEditingNode(null); }}
          highlightedNodes={highlightedNodes}
          onEdgeCreate={handleEdgeCreate}
        />

        {/* Top Toolbar */}
        {!isReadOnly && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <div className="pointer-events-auto bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-4 py-2 flex gap-3">
              <button onClick={() => { setEditingNode(null); setShowNodeForm(true); }}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                + 添加主播
              </button>
              <button onClick={() => { setEditingGroup(null); setShowGroupForm(true); }}
                className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                + 创建圈层
              </button>
            </div>
            <div className="pointer-events-auto bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-4 py-2 flex gap-3">
              {selectedNodeId && (
                <button onClick={handleDeleteNode}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-900/30 rounded">
                  删除
                </button>
              )}
              <button className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                导出
              </button>
              <button className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
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
        </div>
      </div>

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
