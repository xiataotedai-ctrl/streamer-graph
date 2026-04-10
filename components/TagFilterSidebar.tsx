'use client';

import { useMemo } from 'react';
import { GraphData, FilterState } from '@/lib/types';
import { CATEGORY_COLORS, IDENTITY_SIZE } from '@/lib/constants';

interface TagFilterSidebarProps {
  data: GraphData;
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

const IDENTITY_LABELS: Record<number, string> = {
  1: '尾部', 2: '中下', 3: '腰部', 4: '头部', 5: '顶流',
};

const IDENTITY_COLORS: Record<number, string> = {
  1: '#78909c', 2: '#66bb6a', 3: '#ffd54f', 4: '#ff7043', 5: '#ef5350',
};

export default function TagFilterSidebar({ data, filter, onFilterChange }: TagFilterSidebarProps) {
  // Collect unique tag values from all nodes
  const tagOptions = useMemo(() => {
    const categories = new Set<string>();
    const regions = new Set<string>();
    const talents = new Set<string>();
    const identityLevels = new Set<number>();

    data.nodes.forEach(node => {
      node.tags.categories.forEach(c => categories.add(c));
      node.tags.regions.forEach(r => regions.add(r));
      node.tags.talents.forEach(t => talents.add(t));
      identityLevels.add(node.identityLevel);
    });

    return {
      categories: Array.from(categories).sort(),
      regions: Array.from(regions).sort(),
      talents: Array.from(talents).sort(),
      identityLevels: Array.from(identityLevels).sort((a, b) => b - a),
    };
  }, [data]);

  const toggleFilter = (dimension: keyof FilterState, value: string | number) => {
    const current = filter[dimension] as (string | number)[];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFilterChange({ ...filter, [dimension]: next });
  };

  const hasFilters = filter.categories.length > 0 || filter.regions.length > 0 ||
    filter.talents.length > 0 || filter.identityLevels.length > 0;

  const clearFilters = () => {
    onFilterChange({ categories: [], regions: [], talents: [], sections: [], identityLevels: [], customTags: [] });
  };

  if (data.nodes.length === 0) {
    return (
      <aside className="w-64 bg-[#1a1a2e] border-r border-gray-800 p-4 overflow-y-auto flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">标签筛选</h2>
        <p className="text-xs text-gray-600">添加主播后可筛选</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-[#1a1a2e] border-r border-gray-800 p-4 overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400">标签筛选</h2>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-blue-400 hover:text-blue-300">
            清除
          </button>
        )}
      </div>

      {/* Identity Level */}
      {tagOptions.identityLevels.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-500 mb-1.5">身份等级</h3>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.identityLevels.map(level => (
              <button key={level} onClick={() => toggleFilter('identityLevels', level)}
                className="text-xs px-2 py-1 rounded-full border"
                style={{
                  borderColor: filter.identityLevels.includes(level) ? IDENTITY_COLORS[level] : '#374151',
                  color: filter.identityLevels.includes(level) ? IDENTITY_COLORS[level] : '#6b7280',
                  background: filter.identityLevels.includes(level) ? `${IDENTITY_COLORS[level]}15` : 'transparent',
                }}>
                {IDENTITY_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {tagOptions.categories.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-500 mb-1.5">品类</h3>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.categories.map(cat => (
              <button key={cat} onClick={() => toggleFilter('categories', cat)}
                className="text-xs px-2 py-1 rounded-full border"
                style={{
                  borderColor: filter.categories.includes(cat) ? (CATEGORY_COLORS[cat] || '#78909c') : '#374151',
                  color: filter.categories.includes(cat) ? (CATEGORY_COLORS[cat] || '#78909c') : '#6b7280',
                  background: filter.categories.includes(cat) ? `${CATEGORY_COLORS[cat] || '#78909c'}15` : 'transparent',
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Regions */}
      {tagOptions.regions.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-500 mb-1.5">地域</h3>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.regions.map(region => (
              <button key={region} onClick={() => toggleFilter('regions', region)}
                className={`text-xs px-2 py-1 rounded-full border ${filter.regions.includes(region) ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-gray-700 text-gray-500'}`}>
                {region}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Talents */}
      {tagOptions.talents.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-gray-500 mb-1.5">才艺</h3>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.talents.map(talent => (
              <button key={talent} onClick={() => toggleFilter('talents', talent)}
                className={`text-xs px-2 py-1 rounded-full border ${filter.talents.includes(talent) ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-gray-700 text-gray-500'}`}>
                {talent}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {hasFilters && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">
            已选 {filter.categories.length + filter.regions.length + filter.talents.length + filter.identityLevels.length} 个筛选条件
          </p>
        </div>
      )}
    </aside>
  );
}
