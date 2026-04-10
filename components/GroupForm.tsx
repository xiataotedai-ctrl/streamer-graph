'use client';

import { useState, useEffect } from 'react';
import { StreamerGroup, StreamerNode } from '@/lib/types';
import { genId } from '@/lib/graph-data';
import { GROUP_COLORS, GROUP_BORDER_COLORS } from '@/lib/constants';

interface GroupFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (group: StreamerGroup) => void;
  nodes: StreamerNode[];
  initialData?: StreamerGroup | null;
}

export default function GroupForm({ open, onClose, onSave, nodes, initialData }: GroupFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<StreamerGroup['type']>('family');
  const [colorIndex, setColorIndex] = useState(0);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setMemberIds([...initialData.memberIds]);
      const ci = GROUP_COLORS.indexOf(initialData.color);
      setColorIndex(ci >= 0 ? ci : 0);
    } else {
      setName('');
      setType('family');
      setColorIndex(Math.floor(Math.random() * GROUP_COLORS.length));
      setMemberIds([]);
    }
  }, [initialData, open]);

  if (!open) return null;

  const toggleMember = (nodeId: string) => {
    setMemberIds(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const group: StreamerGroup = {
      id: initialData?.id || genId(),
      name: name.trim(),
      type,
      color: GROUP_COLORS[colorIndex],
      memberIds,
    };
    onSave(group);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-xl p-6 w-[480px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{initialData ? '编辑圈层' : '创建圈层'}</h2>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">圈层名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：XX家族、YY战队"
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">类型</label>
            <div className="flex gap-2 flex-wrap">
              {[['family', '家族'], ['team', '战队'], ['circle', '圈子'], ['guild', '公会'], ['custom', '自定义']].map(([val, label]) => (
                <button key={val} onClick={() => setType(val as StreamerGroup['type'])}
                  className={`text-xs px-3 py-1.5 rounded-full border ${type === val ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-gray-700 text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">圈层颜色</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_BORDER_COLORS.map((color, i) => (
                <button key={i} onClick={() => setColorIndex(i)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${colorIndex === i ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: color }} />
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">选择成员（{memberIds.length} 人已选）</label>
          {nodes.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">暂无主播，请先添加主播</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {nodes.map(node => (
                <button key={node.id} onClick={() => toggleMember(node.id)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded flex justify-between items-center ${memberIds.includes(node.id) ? 'bg-blue-500/10 text-blue-300' : 'text-gray-400 hover:bg-white/5'}`}>
                  <span>{node.name}</span>
                  <span className="text-xs text-gray-600">{node.tags.categories[0] || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
            {initialData ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
