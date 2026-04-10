'use client';

import { RELATIONSHIP_CONFIG } from '@/lib/constants';
import { RelationshipType } from '@/lib/types';

interface EdgeTypeSelectorProps {
  open: boolean;
  position: { x: number; y: number };
  onSelect: (type: RelationshipType) => void;
  onCancel: () => void;
}

export default function EdgeTypeSelector({ open, position, onSelect, onCancel }: EdgeTypeSelectorProps) {
  if (!open) return null;

  const types = Object.entries(RELATIONSHIP_CONFIG) as [RelationshipType, typeof RELATIONSHIP_CONFIG[RelationshipType]][];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} />
      <div
        className="fixed z-50 bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 shadow-xl min-w-[140px]"
        style={{ left: position.x, top: position.y }}
      >
        <p className="text-xs text-gray-400 px-2 py-1 mb-1">选择关系类型</p>
        {types.map(([type, config]) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/5 flex items-center gap-2"
          >
            <span
              className="inline-block w-4"
              style={{
                background: config.color,
                height: config.width,
                borderTop: config.lineStyle === 'dashed' ? `2px dashed ${config.color}` : undefined,
              }}
            />
            <span style={{ color: config.color }}>{config.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
