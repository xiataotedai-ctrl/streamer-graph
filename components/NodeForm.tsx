'use client';

import { useState, useEffect } from 'react';
import { StreamerNode, StreamerTags } from '@/lib/types';
import { genId } from '@/lib/graph-data';
import { PLATFORMS, REGIONS, TALENTS, CATEGORY_COLORS, CATEGORY_GROUPS, GAMES } from '@/lib/constants';

interface NodeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (node: StreamerNode) => void;
  onDelete?: () => void;
  initialData?: StreamerNode | null;
}

const EMPTY_TAGS: StreamerTags = { regions: [], categories: [], talents: [], sections: [], custom: [] };

export default function NodeForm({ open, onClose, onSave, onDelete, initialData }: NodeFormProps) {
  const [name, setName] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['快手']);
  const [identityLevel, setIdentityLevel] = useState<1|2|3|4|5>(3);
  const [tags, setTags] = useState<StreamerTags>({ ...EMPTY_TAGS });
  const [notes, setNotes] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [customTalent, setCustomTalent] = useState('');
  const [customSection, setCustomSection] = useState('');
  const [showAllGames, setShowAllGames] = useState(false);
  const [customSize, setCustomSize] = useState<number | undefined>(undefined);
  const [customColor, setCustomColor] = useState<string>('');
  const [customAnnotation, setCustomAnnotation] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPlatforms(initialData.platforms?.length ? [...initialData.platforms] : ['快手']);
      setIdentityLevel(initialData.identityLevel);
      setTags({ ...initialData.tags });
      setNotes(initialData.notes || '');
      setCustomSize(initialData.customSize);
      setCustomColor(initialData.customColor || '');
      setCustomAnnotation(initialData.customAnnotation || '');
    } else {
      setName('');
      setPlatforms(['快手']);
      setIdentityLevel(3);
      setTags({ ...EMPTY_TAGS });
      setNotes('');
      setCustomSize(undefined);
      setCustomColor('');
      setCustomAnnotation('');
    }
  }, [initialData, open]);

  if (!open) return null;

  const toggleTag = (dimension: keyof StreamerTags, value: string) => {
    setTags(prev => {
      const arr = prev[dimension];
      return {
        ...prev,
        [dimension]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const node: StreamerNode = {
      id: initialData?.id || genId(),
      name: name.trim(),
      platforms,
      tags,
      identityLevel,
      customSize: customSize || undefined,
      customColor: customColor || undefined,
      customAnnotation: customAnnotation.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    onSave(node);
    onClose();
  };

  const TagButton = ({ dim, value, color }: { dim: keyof StreamerTags; value: string; color?: string }) => {
    const active = tags[dim].includes(value);
    return (
      <button
        onClick={() => toggleTag(dim, value)}
        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-white/10' : 'border-gray-700 text-gray-500'}`}
        style={active ? { borderColor: color || '#4fc3f7', color: color || '#4fc3f7' } : {}}
      >
        {value}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-xl p-6 w-[520px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{initialData ? '编辑主播' : '添加主播'}</h2>

        {/* 基本信息 */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">主播名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="输入主播名称"
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">平台（可多选）</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map(p => {
                const active = platforms.includes(p);
                return (
                  <button key={p} onClick={() => setPlatforms(prev =>
                    active ? prev.filter(x => x !== p) : [...prev, p]
                  )}
                    className={`text-xs px-2.5 py-1 rounded-full border ${active ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-gray-700 text-gray-500'}`}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">身份等级</label>
            <select value={identityLevel} onChange={e => setIdentityLevel(Number(e.target.value) as 1|2|3|4|5)}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm">
              <option value={1}>尾部主播</option>
              <option value={2}>中下部</option>
              <option value={3}>腰部主播</option>
              <option value={4}>头部主播</option>
              <option value={5}>顶流</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">自定义大小</label>
              {customSize && (
                <button onClick={() => setCustomSize(undefined)} className="text-[10px] text-gray-600 hover:text-gray-400">重置</button>
              )}
            </div>
            <input type="range" min={16} max={100} value={customSize || 40}
              onChange={e => setCustomSize(Number(e.target.value))}
              className="w-full accent-blue-500" />
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>小</span>
              <span>{customSize || '自动'}</span>
              <span>大</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">自定义颜色</label>
              {customColor && (
                <button onClick={() => setCustomColor('')} className="text-[10px] text-gray-600 hover:text-gray-400">重置</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={customColor || '#4fc3f7'}
                onChange={e => setCustomColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border border-gray-700" />
              <span className="text-xs text-gray-500">{customColor || '自动（跟随品类）'}</span>
            </div>
          </div>
        </div>

        {/* 品类 — 分组展示 */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1.5 block">品类</label>
          {CATEGORY_GROUPS.map(group => (
            <div key={group.label} className="mb-2">
              <span className="text-[10px] text-gray-600 mr-1">{group.label}</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {group.categories.flat().map(cat => (
                  <TagButton key={cat} dim="categories" value={cat} color={CATEGORY_COLORS[cat]} />
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-1.5">
            <input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="自定义品类"
              className="flex-1 bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-xs" />
            <button onClick={() => { if (customCategory) { toggleTag('categories', customCategory); setCustomCategory(''); } }}
              className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">+</button>
          </div>
        </div>

        {/* 板块/游戏 */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1 block">板块 / 游戏</label>
          <div className="flex flex-wrap gap-1.5">
            {(showAllGames ? GAMES : GAMES.slice(0, 8)).map(game => (
              <TagButton key={game} dim="sections" value={game} color="#42a5f5" />
            ))}
          </div>
          {GAMES.length > 8 && (
            <button onClick={() => setShowAllGames(!showAllGames)}
              className="text-[10px] text-gray-600 hover:text-gray-400 mt-1">
              {showAllGames ? '收起' : `展开全部 (${GAMES.length})`}
            </button>
          )}
          <div className="flex gap-2 mt-1.5">
            <input value={customSection} onChange={e => setCustomSection(e.target.value)} placeholder="自定义游戏/板块"
              className="flex-1 bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-xs" />
            <button onClick={() => { if (customSection) { toggleTag('sections', customSection); setCustomSection(''); } }}
              className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">+</button>
          </div>
        </div>

        {/* 地域 */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1 block">地域</label>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map(r => (
              <button key={r} onClick={() => toggleTag('regions', r)}
                className={`text-xs px-2 py-1 rounded-full border ${tags.regions.includes(r) ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-gray-700 text-gray-500'}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-1.5">
            <input value={customRegion} onChange={e => setCustomRegion(e.target.value)} placeholder="自定义地域"
              className="flex-1 bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-xs" />
            <button onClick={() => { if (customRegion) { toggleTag('regions', customRegion); setCustomRegion(''); } }}
              className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">+</button>
          </div>
        </div>

        {/* 才艺 */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1 block">才艺</label>
          <div className="flex flex-wrap gap-1.5">
            {TALENTS.map(t => (
              <button key={t} onClick={() => toggleTag('talents', t)}
                className={`text-xs px-2 py-1 rounded-full border ${tags.talents.includes(t) ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-gray-700 text-gray-500'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-1.5">
            <input value={customTalent} onChange={e => setCustomTalent(e.target.value)} placeholder="自定义才艺"
              className="flex-1 bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-xs" />
            <button onClick={() => { if (customTalent) { toggleTag('talents', customTalent); setCustomTalent(''); } }}
              className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">+</button>
          </div>
        </div>

        {/* 备注 */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1 block">备注</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="可选备注..."
            className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm h-16 resize-none" />
        </div>

        {/* 自定义标注 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">标注文本</label>
            {customAnnotation && (
              <button onClick={() => setCustomAnnotation('')} className="text-[10px] text-gray-600 hover:text-gray-400">重置</button>
            )}
          </div>
          <input value={customAnnotation} onChange={e => setCustomAnnotation(e.target.value)} placeholder='自定义标注，如：快手一哥'
            className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          <p className="text-[10px] text-gray-600 mt-1">开启标注显示后，此文本优先于标签自动生成</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-between">
          {initialData && onDelete ? (
            <button onClick={onDelete}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-900/30 rounded-lg">
              删除主播
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
            <button onClick={handleSave} disabled={!name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {initialData ? '保存' : '添加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
