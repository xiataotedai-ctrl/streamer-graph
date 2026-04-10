'use client';

import { useState, useEffect } from 'react';
import { RelationshipEdge, RelationshipType } from '@/lib/types';
import { RELATIONSHIP_CONFIG } from '@/lib/constants';

interface EdgeEditFormProps {
  open: boolean;
  edge: RelationshipEdge | null;
  sourceName: string;
  targetName: string;
  onSave: (edge: RelationshipEdge) => void;
  onDelete: (edgeId: string) => void;
  onClose: () => void;
}

export default function EdgeEditForm({ open, edge, sourceName, targetName, onSave, onDelete, onClose }: EdgeEditFormProps) {
  const [type, setType] = useState<RelationshipType>('friend');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (edge) {
      setType(edge.type);
      setLabel(edge.label || '');
    }
  }, [edge]);

  if (!open || !edge) return null;

  const handleSave = () => {
    onSave({ ...edge, type, label: label.trim() || undefined });
    onClose();
  };

  const config = RELATIONSHIP_CONFIG[type];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-xl p-6 w-[400px]" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3">编辑关系</h2>
        <p className="text-sm text-gray-400 mb-4">
          <span style={{ color: '#4fc3f7' }}>{sourceName}</span>
          <span className="mx-2">→</span>
          <span style={{ color: '#4fc3f7' }}>{targetName}</span>
        </p>

        {/* Relationship type */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1.5 block">关系类型</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(RELATIONSHIP_CONFIG) as [RelationshipType, typeof RELATIONSHIP_CONFIG[RelationshipType]][]).map(([t, c]) => (
              <button key={t} onClick={() => setType(t)}
                className={`text-xs px-2.5 py-1.5 rounded-full border ${type === t ? '' : 'border-gray-700 text-gray-500'}`}
                style={type === t ? { borderColor: c.color, color: c.color, background: `${c.color}15` } : {}}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom label */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">关系备注</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder={`例如：${config.label}、师从XX、2024年搭档...`}
            className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        </div>

        <div className="flex gap-3 justify-between">
          <button onClick={() => { onDelete(edge.id); onClose(); }}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-900/30 rounded-lg">
            删除关系
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
            <button onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
