'use client';

import { useState, useEffect } from 'react';
import { StreamerNode, StreamerTags } from '@/lib/types';
import { genId } from '@/lib/graph-data';
import { PLATFORMS, REGIONS, TALENTS, CATEGORY_COLORS } from '@/lib/constants';

interface NodeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (node: StreamerNode) => void;
  initialData?: StreamerNode | null;
}

const EMPTY_TAGS: StreamerTags = { regions: [], categories: [], talents: [], sections: [], custom: [] };

export default function NodeForm({ open, onClose, onSave, initialData }: NodeFormProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('抖音');
  const [identityLevel, setIdentityLevel] = useState<1|2|3|4|5>(3);
  const [tags, setTags] = useState<StreamerTags>({ ...EMPTY_TAGS });
  const [notes, setNotes] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [customTalent, setCustomTalent] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPlatform(initialData.platform);
      setIdentityLevel(initialData.identityLevel);
      setTags({ ...initialData.tags });
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setPlatform('抖音');
      setIdentityLevel(3);
      setTags({ ...EMPTY_TAGS });
      setNotes('');
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
      platform,
      tags,
      identityLevel,
      notes: notes.trim() || undefined,
    };
    onSave(node);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-xl p-6 w-[480px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{initialData ? '编辑主播' : '添加主播'}</h2>

        {/* 基本信息 */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">主播名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="输入主播名称"
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">平台</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex-1">
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
          </div>
        </div>

        {/* 品类标签 */}
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1 block">品类</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(CATEGORY_COLORS).map(cat => (
              <button key={cat} onClick={() => toggleTag('categories', cat)}
                className={`text-xs px-2.5 py-1 rounded-full border ${tags.categories.includes(cat) ? 'bg-white/10 text-white' : 'border-gray-700 text-gray-500'}`}
                style={tags.categories.includes(cat) ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] } : {}}>
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-1.5">
            <input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="自定义品类"
              className="flex-1 bg-[#0f0f1a] border border-gray-700 rounded px-2 py-1 text-xs" />
            <button onClick={() => { if (customCategory) { toggleTag('categories', customCategory); setCustomCategory(''); } }}
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
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">备注</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="可选备注..."
            className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm h-16 resize-none" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
            {initialData ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
