'use client';

import { useState, useCallback } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import { GraphData } from '@/lib/types';
import { createEmptyGraph } from '@/lib/graph-data';
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
  const [isReadOnly] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('share');
  });

  // Auto-save on every change
  const updateData = useCallback((newData: GraphData) => {
    setGraphData(newData);
    autoSave(JSON.stringify(newData));
  }, []);

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
          onNodeClick={setSelectedNodeId}
          onCanvasClick={() => setSelectedNodeId(null)}
          highlightedNodes={highlightedNodes}
        />

        {/* Top Toolbar */}
        {!isReadOnly && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
            <div className="pointer-events-auto bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-4 py-2 flex gap-3">
              <button className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                + 添加主播
              </button>
              <button className="text-xs text-gray-300 hover:text-white px-3 py-1.5 bg-[#16213e] rounded">
                + 创建圈层
              </button>
            </div>
            <div className="pointer-events-auto bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-4 py-2 flex gap-3">
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
    </main>
  );
}
