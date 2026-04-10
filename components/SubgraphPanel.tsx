'use client';

import { GraphData } from '@/lib/types';
import { extractSubgraph } from '@/lib/graph-data';

interface SubgraphPanelProps {
  open: boolean;
  onClose: () => void;
  selectedNodeIds: string[];
  fullData: GraphData;
  onExportSubgraph: (data: GraphData) => void;
}

export default function SubgraphPanel({ open, onClose, selectedNodeIds, fullData, onExportSubgraph }: SubgraphPanelProps) {
  if (!open) return null;

  const subgraph = extractSubgraph(fullData, selectedNodeIds);

  return (
    <div className="fixed right-4 top-16 bottom-16 w-80 bg-[#1a1a2e] border border-gray-700 rounded-xl shadow-2xl z-30 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold">子图预览</h3>
        <div className="flex gap-2">
          <button onClick={() => onExportSubgraph(subgraph)}
            className="text-xs px-2.5 py-1 bg-blue-600 rounded hover:bg-blue-500">
            导出子图
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-xs text-gray-500">
          {subgraph.nodes.length} 位主播 · {subgraph.edges.length} 条关系 · {subgraph.groups.length} 个圈层
        </div>

        {/* Nodes list */}
        <div>
          <h4 className="text-xs text-gray-400 mb-1.5">主播</h4>
          <div className="space-y-1">
            {subgraph.nodes.map(node => (
              <div key={node.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-[#0f0f1a]">
                <span className="text-gray-300">{node.name}</span>
                <span className="text-gray-600">{node.tags.categories[0] || ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edges list */}
        {subgraph.edges.length > 0 && (
          <div>
            <h4 className="text-xs text-gray-400 mb-1.5">关系</h4>
            <div className="space-y-1">
              {subgraph.edges.map(edge => {
                const source = subgraph.nodes.find(n => n.id === edge.source);
                const target = subgraph.nodes.find(n => n.id === edge.target);
                return (
                  <div key={edge.id} className="text-xs px-2 py-1 rounded bg-[#0f0f1a] text-gray-400">
                    {source?.name || edge.source} — {target?.name || edge.target}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
