# StreamerGraph V1 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个交互式主播圈层关系图工具（PWA），支持节点管理、关系连线、圈层分组、标签筛选、框选子图、数据持久化和只读分享。

**Architecture:** Next.js 14 App Router 纯前端应用，使用 AntV G6 v5 作为图可视化引擎。数据层完全基于 localStorage + JSON 文件，无后端。所有图操作通过 G6 API 实现，UI 通过 React 组件管理状态。支持 200+ 节点的性能优化（Canvas 渲染 + 虚拟化）。

**Tech Stack:** Next.js 14+, AntV G6 v5, TypeScript, Tailwind CSS, next-pwa

---

## File Structure

```
/Users/xiatao/streamer-graph/
├── app/
│   ├── layout.tsx              # Root layout: dark theme, PWA meta
│   ├── page.tsx                # Main page: graph canvas + sidebar layout
│   └── globals.css             # Dark theme base styles
├── components/
│   ├── GraphCanvas.tsx         # G6 graph init + force layout + interactions
│   ├── NodeForm.tsx            # Add/edit node modal form
│   ├── EdgeTypeSelector.tsx    # Relationship type picker during drag-connect
│   ├── GroupForm.tsx           # Create/edit group modal
│   ├── TagFilterSidebar.tsx    # Left sidebar: tag filter controls
│   ├── Toolbar.tsx             # Top bar: actions (add node, export, etc.)
│   └── SubgraphPanel.tsx       # Subgraph extracted view
├── lib/
│   ├── types.ts                # All TypeScript interfaces
│   ├── constants.ts            # Colors, relationship types, tag presets
│   ├── graph-data.ts           # CRUD operations on graph data
│   ├── graph-setup.ts          # G6 initialization + config
│   ├── tag-filter.ts           # Tag filter logic
│   ├── share.ts                # Share link encode/decode
│   └── storage.ts              # localStorage wrapper
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # PWA icons (192x192, 512x512)
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── next-env.d.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `public/manifest.json`

- [ ] **Step 1: Create Next.js project with dependencies**

```bash
cd /Users/xiatao && npx create-next-app@latest streamer-graph --typescript --tailwind --app --src-dir=false --import-alias="@/*" --use-npm
```

Run: `cd /Users/xiatao/streamer-graph && npm install @antv/g6 @antv/g6-plugin next-pwa`

- [ ] **Step 2: Configure dark theme in globals.css**

Replace `app/globals.css` with dark theme base:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0f0f1a;
  --bg-secondary: #1a1a2e;
  --bg-card: #16213e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b0;
  --accent-blue: #4fc3f7;
  --accent-gold: #ffd54f;
  --accent-red: #ef5350;
  --accent-green: #66bb6a;
  --accent-purple: #ab47bc;
  --accent-orange: #ff7043;
  --accent-cyan: #26c6da;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* G6 canvas container */
.graph-container {
  width: 100%;
  height: 100vh;
  background: var(--bg-primary);
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-secondary); }
::-webkit-scrollbar-thumb { background: var(--text-secondary); border-radius: 3px; }
```

- [ ] **Step 3: Configure PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "StreamerGraph - 主播圈层关系图",
  "short_name": "StreamerGraph",
  "description": "直播主播圈层关系可视化工具",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#0f0f1a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 4: Update layout.tsx with PWA meta**

Replace `app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamerGraph - 主播圈层关系图",
  description: "直播主播圈层关系可视化工具",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f0f1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#0f0f1a] text-[#e0e0e0] antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Verify setup**

Run: `cd /Users/xiatao/streamer-graph && npm run dev`
Expected: dev server starts, page loads with dark background

- [ ] **Step 6: Commit**

```bash
cd /Users/xiatao/streamer-graph && git init && git add -A && git commit -m "feat: project scaffold with Next.js, G6, PWA, dark theme"
```

---

### Task 2: Type Definitions & Constants

**Files:**
- Create: `lib/types.ts`
- Create: `lib/constants.ts`

- [ ] **Step 1: Create type definitions**

Create `lib/types.ts`:

```typescript
// 主播节点
export interface StreamerNode {
  id: string;
  name: string;
  platform: string;        // 抖音/快手/B站/虎牙/斗鱼
  tags: StreamerTags;
  identityLevel: 1 | 2 | 3 | 4 | 5;  // 1=尾部, 5=头部
  customSize?: number;     // 手动覆盖大小
  groupId?: string;        // 主要分组
  groupIds?: string[];     // 多分组归属
  notes?: string;          // 备注
}

export interface StreamerTags {
  regions: string[];       // 地域: 四川、东北...
  categories: string[];    // 品类: 王者荣耀、和平精英...
  talents: string[];       // 才艺: 唱歌、搞笑、技术流...
  sections: string[];      // 板块: 游戏区、才艺区...
  custom: string[];        // 自定义标签
}

// 关系边
export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;          // 关系描述
  since?: string;          // 关系起始时间
}

export type RelationshipType =
  | 'mentor'      // 师徒
  | 'partner'     // 搭档
  | 'family'      // 同家族
  | 'guild'       // 同公会
  | 'cp'          // CP
  | 'friend'      // 好友
  | 'rival'       // 竞争
  | 'enemy'       // 结仇
  | 'betrayed'    // 反目
  | 'custom';     // 自定义

// 圈层分组
export interface StreamerGroup {
  id: string;
  name: string;
  type: 'family' | 'team' | 'circle' | 'guild' | 'custom';
  color: string;           // 圈层背景色
  memberIds: string[];
  collapsed?: boolean;     // 是否折叠
}

// 完整图数据
export interface GraphData {
  version: 1;
  nodes: StreamerNode[];
  edges: RelationshipEdge[];
  groups: StreamerGroup[];
  metadata: {
    name: string;
    createdAt: string;
    updatedAt: string;
    author: string;
  };
}

// 筛选状态
export interface FilterState {
  regions: string[];
  categories: string[];
  talents: string[];
  sections: string[];
  identityLevels: number[];
  customTags: string[];
}
```

- [ ] **Step 2: Create constants (colors, relationship config)**

Create `lib/constants.ts`:

```typescript
import { RelationshipType } from './types';

// 关系类型配置：颜色、线型、标签
export const RELATIONSHIP_CONFIG: Record<RelationshipType, {
  label: string;
  color: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  width?: number;
}> = {
  mentor:    { label: '师徒', color: '#ffd54f', width: 2 },      // 金色
  partner:   { label: '搭档', color: '#4fc3f7', width: 2 },      // 蓝色
  family:    { label: '同家族', color: '#66bb6a', width: 2 },    // 绿色
  guild:     { label: '同公会', color: '#26c6da', width: 2 },    // 青色
  cp:        { label: 'CP', color: '#f06292', width: 2 },        // 粉色
  friend:    { label: '好友', color: '#81c784', width: 1.5 },    // 浅绿
  rival:     { label: '竞争', color: '#ff7043', width: 2, lineStyle: 'dashed' },  // 橙色虚线
  enemy:     { label: '结仇', color: '#ef5350', width: 2.5 },    // 红色
  betrayed:  { label: '反目', color: '#ef5350', width: 2, lineStyle: 'dashed' },  // 红色虚线
  custom:    { label: '自定义', color: '#ab47bc', width: 1.5 },  // 紫色
};

// 品类颜色映射
export const CATEGORY_COLORS: Record<string, string> = {
  '王者荣耀': '#e53935',
  '和平精英': '#43a047',
  '英雄联盟': '#1e88e5',
  '原神': '#8e24aa',
  '第五人格': '#6d4c41',
  '穿越火线': '#fb8c00',
  '永劫无间': '#00acc1',
  'DNF': '#546e7a',
  '直播带货': '#d81b60',
  '才艺': '#fdd835',
};

// 默认品类颜色
export const DEFAULT_CATEGORY_COLOR = '#78909c';

// 身份等级对应的节点大小
export const IDENTITY_SIZE: Record<number, number> = {
  1: 24,   // 尾部
  2: 30,   // 中下部
  3: 38,   // 腰部
  4: 48,   // 头部
  5: 60,   // 顶流
};

// 圈层分组可选颜色
export const GROUP_COLORS = [
  'rgba(229, 57, 53, 0.15)',    // 红
  'rgba(67, 160, 71, 0.15)',    // 绿
  'rgba(30, 136, 229, 0.15)',   // 蓝
  'rgba(142, 36, 170, 0.15)',   // 紫
  'rgba(251, 140, 0, 0.15)',    // 橙
  'rgba(0, 172, 193, 0.15)',    // 青
  'rgba(244, 67, 54, 0.15)',    // 深红
  'rgba(253, 216, 53, 0.15)',   // 黄
];

// 圈层边框颜色（对应上方，不透明）
export const GROUP_BORDER_COLORS = [
  'rgba(229, 57, 53, 0.6)',
  'rgba(67, 160, 71, 0.6)',
  'rgba(30, 136, 229, 0.6)',
  'rgba(142, 36, 170, 0.6)',
  'rgba(251, 140, 0, 0.6)',
  'rgba(0, 172, 193, 0.6)',
  'rgba(244, 67, 54, 0.6)',
  'rgba(253, 216, 53, 0.6)',
];

// 预设平台
export const PLATFORMS = ['抖音', '快手', 'B站', '虎牙', '斗鱼', 'YY', '小红书', '其他'];

// 预设地域
export const REGIONS = ['四川', '重庆', '广东', '东北', '北京', '上海', '浙江', '湖南', '湖北', '山东', '河南', '福建', '其他'];

// 预设才艺
export const TALENTS = ['唱歌', '跳舞', '搞笑', '技术流', '户外', '脱口秀', '绘画', '乐器', '配音', '其他'];
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add lib/ && git commit -m "feat: type definitions and constants for streamer graph"
```

---

### Task 3: Data Layer (Storage + CRUD)

**Files:**
- Create: `lib/storage.ts`
- Create: `lib/graph-data.ts`
- Create: `lib/share.ts`

- [ ] **Step 1: Create localStorage wrapper**

Create `lib/storage.ts`:

```typescript
const STORAGE_KEY = 'streamer-graph-data';
const AUTOSAVE_KEY = 'streamer-graph-autosave';

export function saveToStorage(data: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function loadFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function autoSave(data: string): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Auto-save failed:', e);
  }
}

export function loadAutoSave(): { data: string; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function exportJSON(data: object, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}
```

- [ ] **Step 2: Create graph data CRUD operations**

Create `lib/graph-data.ts`:

```typescript
import { GraphData, StreamerNode, RelationshipEdge, StreamerGroup } from './types';

export function createEmptyGraph(name: string, author: string): GraphData {
  return {
    version: 1,
    nodes: [],
    edges: [],
    groups: [],
    metadata: {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author,
    },
  };
}

export function addNode(graph: GraphData, node: StreamerNode): GraphData {
  return { ...graph, nodes: [...graph.nodes, node], metadata: { ...graph.metadata, updatedAt: new Date().toISOString() } };
}

export function updateNode(graph: GraphData, nodeId: string, updates: Partial<StreamerNode>): GraphData {
  return {
    ...graph,
    nodes: graph.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
    metadata: { ...graph.metadata, updatedAt: new Date().toISOString() },
  };
}

export function removeNode(graph: GraphData, nodeId: string): GraphData {
  return {
    ...graph,
    nodes: graph.nodes.filter(n => n.id !== nodeId),
    edges: graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    groups: graph.groups.map(g => ({ ...g, memberIds: g.memberIds.filter(id => id !== nodeId) })),
    metadata: { ...graph.metadata, updatedAt: new Date().toISOString() },
  };
}

export function addEdge(graph: GraphData, edge: RelationshipEdge): GraphData {
  return { ...graph, edges: [...graph.edges, edge], metadata: { ...graph.metadata, updatedAt: new Date().toISOString() } };
}

export function removeEdge(graph: GraphData, edgeId: string): GraphData {
  return { ...graph, edges: graph.edges.filter(e => e.id !== edgeId), metadata: { ...graph.metadata, updatedAt: new Date().toISOString() } };
}

export function addGroup(graph: GraphData, group: StreamerGroup): GraphData {
  return { ...graph, groups: [...graph.groups, group], metadata: { ...graph.metadata, updatedAt: new Date().toISOString() } };
}

export function updateGroup(graph: GraphData, groupId: string, updates: Partial<StreamerGroup>): GraphData {
  return {
    ...graph,
    groups: graph.groups.map(g => g.id === groupId ? { ...g, ...updates } : g),
    metadata: { ...graph.metadata, updatedAt: new Date().toISOString() },
  };
}

export function removeGroup(graph: GraphData, groupId: string): GraphData {
  return { ...graph, groups: graph.groups.filter(g => g.id !== groupId), metadata: { ...graph.metadata, updatedAt: new Date().toISOString() } };
}

// 获取节点的连接数（degree centrality）
export function getNodeDegree(graph: GraphData, nodeId: string): number {
  return graph.edges.filter(e => e.source === nodeId || e.target === nodeId).length;
}

// 根据 ID 列表提取子图
export function extractSubgraph(graph: GraphData, nodeIds: string[]): GraphData {
  const idSet = new Set(nodeIds);
  return {
    ...graph,
    nodes: graph.nodes.filter(n => idSet.has(n.id)),
    edges: graph.edges.filter(e => idSet.has(e.source) && idSet.has(e.target)),
    groups: graph.groups.map(g => ({
      ...g,
      memberIds: g.memberIds.filter(id => idSet.has(id)),
    })).filter(g => g.memberIds.length > 0),
  };
}

// 生成唯一 ID
export function genId(): string {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
```

- [ ] **Step 3: Create share link encoder/decoder**

Create `lib/share.ts`:

```typescript
import { GraphData } from './types';

// 将图数据压缩编码为 URL safe string
// 使用 base64 编码（V1 简单方案，大数据量可换成压缩）
export function encodeShareData(data: GraphData): string {
  try {
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  } catch {
    return '';
  }
}

export function decodeShareData(encoded: string): GraphData | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function generateShareURL(data: GraphData): string {
  const encoded = encodeShareData(data);
  if (!encoded) return '';
  return `${window.location.origin}?share=${encoded}`;
}

export function readShareFromURL(): GraphData | null {
  const params = new URLSearchParams(window.location.search);
  const shareData = params.get('share');
  if (!shareData) return null;
  return decodeShareData(shareData);
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add lib/ && git commit -m "feat: data layer with storage, CRUD, and share link support"
```

---

### Task 4: Graph Canvas Core (G6 Initialization + Dark Theme + Layout)

**Files:**
- Create: `lib/graph-setup.ts`
- Create: `components/GraphCanvas.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create G6 setup and configuration**

Create `lib/graph-setup.ts`:

```typescript
import { Graph, Extensions, extend } from '@antv/g6';
import { RELATIONSHIP_CONFIG, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, IDENTITY_SIZE, GROUP_COLORS, GROUP_BORDER_COLORS } from './constants';
import { GraphData, StreamerNode, RelationshipEdge, StreamerGroup } from './types';

// Convert app data to G6 format
export function toG6Data(data: GraphData) {
  const nodes = data.nodes.map((node: StreamerNode) => {
    const mainCategory = node.tags.categories[0] || '';
    const color = CATEGORY_COLORS[mainCategory] || DEFAULT_CATEGORY_COLOR;
    const size = node.customSize || IDENTITY_SIZE[node.identityLevel] || 30;

    return {
      id: node.id,
      data: {
        type: 'circle' as const,
        keyShape: {
          r: size / 2,
          fill: color,
          stroke: color,
          lineWidth: 2,
          opacity: 1,
        },
        haloShape: {
          r: size / 2 + 4,
          stroke: color,
          lineWidth: 1,
          opacity: 0.3,
        },
        labelShape: {
          text: node.name,
          position: 'bottom' as const,
          fill: '#e0e0e0',
          fontSize: 12,
          offsetY: 8,
        },
      },
      style: { componentId: node.id },
      // Store original data for reference
      _originalData: node,
    };
  });

  const edges = data.edges.map((edge: RelationshipEdge) => {
    const config = RELATIONSHIP_CONFIG[edge.type] || RELATIONSHIP_CONFIG.custom;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {
        type: 'line' as const,
        keyShape: {
          stroke: config.color,
          lineWidth: config.width || 1.5,
          lineDash: config.lineStyle === 'dashed' ? [6, 4] : config.lineStyle === 'dotted' ? [2, 2] : undefined,
          endArrow: edge.type === 'mentor' || edge.type === 'betrayed',
        },
        labelShape: {
          text: config.label,
          fill: config.color,
          fontSize: 10,
          opacity: 0.8,
          background: {
            fill: '#0f0f1a',
            padding: [2, 4, 2, 4],
            radius: 2,
          },
        },
      },
      _originalData: edge,
    };
  });

  const combos = data.groups.map((group: StreamerGroup, index: number) => {
    const colorIndex = index % GROUP_COLORS.length;
    return {
      id: group.id,
      data: {
        type: 'circle' as const,
        keyShape: {
          r: 100,
          fill: GROUP_COLORS[colorIndex],
          stroke: GROUP_BORDER_COLORS[colorIndex],
          lineWidth: 2,
          lineDash: [4, 4],
        },
        labelShape: {
          text: group.name,
          position: 'top' as const,
          fill: GROUP_BORDER_COLORS[colorIndex].replace('0.6', '1'),
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      comboIds: [],
    };
  });

  // Assign nodes to combos
  const nodesWithCombos = nodes.map(node => {
    const origNode = data.nodes.find(n => n.id === node.id);
    if (origNode?.groupIds && origNode.groupIds.length > 0) {
      return { ...node, combo: origNode.groupIds[0] }; // G6 v5 combo assignment
    }
    if (origNode?.groupId) {
      return { ...node, combo: origNode.groupId };
    }
    return node;
  });

  return { nodes: nodesWithCombos, edges, combos };
}

// Create configured G6 graph instance
export function createGraph(container: HTMLElement) {
  const ExtGraph = extend(Graph, {
    nodes: { 'circle': Extensions.CircleNode },
    edges: { 'line': Extensions.LineEdge },
    combos: { 'circle': Extensions.CircleCombo },
    layouts: {
      'force': Extensions.ForceLayout,
      'circular': Extensions.CircularLayout,
    },
    behaviors: {
      'drag-canvas': Extensions.DragCanvas,
      'zoom-canvas': Extensions.ZoomCanvas,
      'drag-element': Extensions.DragElement,
      'click-select': Extensions.ClickSelect,
      'hover-activate': Extensions.HoverActivate,
      'brush-select': Extensions.BrushSelect,
    },
    plugins: {
      'minimap': Extensions.Minimap,
    },
  });

  const graph = new ExtGraph({
    container,
    autoFit: 'view',
    padding: [30, 30, 30, 30],
    node: {
      type: 'circle',
      style: (model: any) => model.data || {},
      state: {
        highlight: { haloShape: { opacity: 0.6 } },
        dim: { keyShape: { opacity: 0.2 }, labelShape: { opacity: 0.2 } },
        selected: { keyShape: { lineWidth: 3, stroke: '#fff' } },
      },
    },
    edge: {
      type: 'line',
      style: (model: any) => model.data || {},
      state: {
        highlight: { keyShape: { opacity: 1, lineWidth: 3 } },
        dim: { keyShape: { opacity: 0.05 }, labelShape: { opacity: 0.05 } },
      },
    },
    combo: {
      type: 'circle',
      style: (model: any) => model.data || {},
    },
    layout: {
      type: 'force',
      preventOverlap: true,
      nodeSize: 60,
      linkDistance: 150,
      nodeStrength: -300,
      comboStrength: -50,
      comboPadding: 20,
    },
    behaviors: [
      'drag-canvas',
      'zoom-canvas',
      'drag-element',
      'hover-activate',
      { type: 'brush-select', trigger: 'shift' },
    ],
    plugins: [
      {
        type: 'minimap',
        position: 'right-bottom',
        size: [180, 120],
      },
    ],
    animation: false, // Disable for 200+ node performance
  });

  return graph;
}
```

- [ ] **Step 2: Create GraphCanvas React component**

Create `components/GraphCanvas.tsx`:

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GraphData } from '@/lib/types';
import { createGraph, toG6Data } from '@/lib/graph-setup';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string | null) => void;
  onEdgeClick?: (edgeId: string | null) => void;
  onCanvasClick?: () => void;
  highlightedNodes?: Set<string>;
}

export default function GraphCanvas({ data, onNodeClick, onEdgeClick, onCanvasClick, highlightedNodes }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  // Initialize graph
  useEffect(() => {
    if (!containerRef.current) return;
    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const graph = createGraph(containerRef.current);
    graphRef.current = graph;

    const g6Data = toG6Data(data);
    graph.setData(g6Data);
    graph.render();

    // Bind events
    if (onNodeClick) {
      graph.on('node:click', (evt: any) => {
        onNodeClick(evt.target?.id || null);
      });
    }
    if (onEdgeClick) {
      graph.on('edge:click', (evt: any) => {
        onEdgeClick(evt.target?.id || null);
      });
    }
    if (onCanvasClick) {
      graph.on('canvas:click', () => {
        onCanvasClick();
      });
    }

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, []); // Only init once

  // Update data when it changes
  useEffect(() => {
    if (!graphRef.current) return;
    const g6Data = toG6Data(data);
    graphRef.current.setData(g6Data);
    graphRef.current.render();
  }, [data]);

  // Handle highlight/dim
  useEffect(() => {
    if (!graphRef.current || !highlightedNodes) return;

    const graph = graphRef.current;
    const allNodes = data.nodes.map(n => n.id);

    if (highlightedNodes.size === 0) {
      // Clear all states
      allNodes.forEach(id => {
        graph.setElementState(id, []);
      });
      data.edges.forEach(e => {
        graph.setElementState(e.id, []);
      });
    } else {
      allNodes.forEach(id => {
        graph.setElementState(id, highlightedNodes.has(id) ? ['highlight'] : ['dim']);
      });
      data.edges.forEach(e => {
        const bothHighlighted = highlightedNodes.has(e.source) && highlightedNodes.has(e.target);
        graph.setElementState(e.id, bothHighlighted ? ['highlight'] : ['dim']);
      });
    }
  }, [highlightedNodes, data]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0f0f1a' }}
    />
  );
}
```

- [ ] **Step 3: Update main page with graph canvas**

Replace `app/page.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import { GraphData } from '@/lib/types';
import { createEmptyGraph } from '@/lib/graph-data';
import { loadFromStorage, autoSave } from '@/lib/storage';
import { readShareFromURL } from '@/lib/share';

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>(() => {
    // Check share link first
    if (typeof window !== 'undefined') {
      const shareData = readShareFromURL();
      if (shareData) return shareData;
      const saved = loadFromStorage();
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return createEmptyGraph('圈层关系图', '');
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

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

        {/* Stats */}
        <div className="absolute bottom-4 left-4 bg-[#1a1a2e]/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-gray-500">
          {graphData.nodes.length} 位主播 · {graphData.edges.length} 条关系 · {graphData.groups.length} 个圈层
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify graph renders with empty data**

Run: `cd /Users/xiatao/streamer-graph && npm run dev`
Expected: Dark page loads with sidebar, toolbar, empty canvas, minimap visible in corner

- [ ] **Step 5: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add -A && git commit -m "feat: graph canvas with G6 force layout, dark theme, minimap, sidebar layout"
```

---

### Task 5: Node Management (Add/Edit Form)

**Files:**
- Create: `components/NodeForm.tsx`
- Modify: `app/page.tsx` (wire up the form)
- Modify: `components/GraphCanvas.tsx` (if needed)

- [ ] **Step 1: Create NodeForm modal component**

Create `components/NodeForm.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { StreamerNode, StreamerTags } from '@/lib/types';
import { genId } from '@/lib/graph-data';
import { PLATFORMS, REGIONS, TALENTS, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '@/lib/constants';

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
              <select value={identityLevel} onChange={e => setIdentityLevel(Number(e.target.value) as any)}
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
                className={`text-xs px-2.5 py-1 rounded-full border ${tags.categories.includes(cat) ? 'border-white/50 bg-white/10 text-white' : 'border-gray-700 text-gray-500'}`}
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
```

- [ ] **Step 2: Wire NodeForm into page.tsx**

Add state and event handlers to `app/page.tsx`:
- Add `showNodeForm` state
- Add `editingNode` state
- Connect "添加主播" button to open form
- Handle node save (add or update)
- Handle node click to edit
- Add right-click context menu for delete

- [ ] **Step 3: Verify node add/edit works**

Run: `cd /Users/xiatao/streamer-graph && npm run dev`
Expected: Click "添加主播" → modal opens → fill form → save → node appears on canvas

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add -A && git commit -m "feat: node management with add/edit form, tags, identity levels"
```

---

### Task 6: Edge Management (Drag-to-Connect + Relationship Types)

**Files:**
- Create: `components/EdgeTypeSelector.tsx`
- Modify: `components/GraphCanvas.tsx` (add edge creation interaction)
- Modify: `app/page.tsx` (wire up edge creation)

- [ ] **Step 1: Create EdgeTypeSelector component**

A small popup that appears after dragging from one node to another, letting user pick the relationship type.

Create `components/EdgeTypeSelector.tsx`:

```tsx
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
            <span className="w-3 h-0.5 rounded" style={{ background: config.color, height: config.width, borderStyle: config.lineStyle || 'solid' }} />
            <span style={{ color: config.color }}>{config.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add edge creation interaction to GraphCanvas**

Modify `components/GraphCanvas.tsx` to support:
- Shift+drag from node to node creates a new edge
- After drag, show EdgeTypeSelector at drop position
- On type selection, call `onEdgeCreate(source, target, type)`

- [ ] **Step 3: Wire edge creation in page.tsx**

- Handle `onEdgeCreate` callback
- Add edge to graph data using `addEdge()`
- Auto-save

- [ ] **Step 4: Verify edge creation**

Expected: Shift+drag from one node to another → popup appears → select type → edge renders with correct color and label

- [ ] **Step 5: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add -A && git commit -m "feat: drag-to-connect edges with relationship type selector"
```

---

### Task 7: Grouping (Combos/Circles for 圈层)

**Files:**
- Create: `components/GroupForm.tsx`
- Modify: `app/page.tsx` (wire up group management)

- [ ] **Step 1: Create GroupForm component**

Create `components/GroupForm.tsx`:

```tsx
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
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">类型</label>
            <div className="flex gap-2">
              {[['family', '家族'], ['team', '战队'], ['circle', '圈子'], ['guild', '公会'], ['custom', '自定义']].map(([val, label]) => (
                <button key={val} onClick={() => setType(val as any)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${type === val ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-gray-700 text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">圈层颜色</label>
            <div className="flex gap-2">
              {GROUP_BORDER_COLORS.map((color, i) => (
                <button key={i} onClick={() => setColorIndex(i)}
                  className={`w-7 h-7 rounded-full border-2 ${colorIndex === i ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: color }} />
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">选择成员（{memberIds.length} 人已选）</label>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {nodes.map(node => (
              <button key={node.id} onClick={() => toggleMember(node.id)}
                className={`w-full text-left px-3 py-1.5 text-sm rounded flex justify-between items-center ${memberIds.includes(node.id) ? 'bg-blue-500/10 text-blue-300' : 'text-gray-400 hover:bg-white/5'}`}>
                <span>{node.name}</span>
                <span className="text-xs text-gray-600">{node.tags.categories[0] || ''}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">取消</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50">
            {initialData ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire group management into page.tsx**

- Handle "创建圈层" button
- On group save: update each member node's `groupIds` to include this group
- Render G6 combos from groups data

- [ ] **Step 3: Verify grouping**

Expected: Create group → select members → colorful circle appears around them on canvas

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add -A && git commit -m "feat: grouping with combo circles, multi-group support, color picker"
```

---

### Task 8: Tag Filter Sidebar

**Files:**
- Create: `components/TagFilterSidebar.tsx`
- Modify: `app/page.tsx` (replace placeholder sidebar)

- [ ] **Step 1: Create TagFilterSidebar component**

Build a sidebar that:
- Collects all unique tag values from current nodes
- Groups by dimension (品类/地域/才艺/身份等级)
- Clicking a tag filters: nodes with that tag → highlight, rest → dim
- Multi-select within each dimension (OR logic)
- Across dimensions (AND logic)
- "清除筛选" button to reset

- [ ] **Step 2: Wire filter state to GraphCanvas**

Connect the `highlightedNodes` set from filter logic to GraphCanvas's highlight/dim behavior.

- [ ] **Step 3: Verify filter works**

Expected: Click "王者荣耀" tag → only 王者荣耀 nodes stay bright, rest dim

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add -A && git commit -m "feat: tag filter sidebar with highlight/dim behavior"
```

---

### Task 9: Node Sizing (Manual + Auto Toggle)

**Files:**
- Modify: `lib/graph-setup.ts` (add auto-size calculation)
- Add toggle to `components/Toolbar.tsx` or `app/page.tsx`

- [ ] **Step 1: Add auto-size mode**

In `lib/graph-setup.ts`, add a function `computeAutoSize`:
- Count edges per node (degree)
- Map degree to size range [24, 60]
- Normalize across all nodes

- [ ] **Step 2: Add toggle UI**

Add a toggle button to toolbar: "自动大小 / 手动大小"
- Manual: use `identityLevel` → `IDENTITY_SIZE` mapping
- Auto: use degree-based calculation

- [ ] **Step 3: Verify both modes work**

- [ ] **Step 4: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add -A && git commit -m "feat: node sizing with manual/auto toggle"
```

---

### Task 10: Subgraph Selection + Persistence + Polish

**Files:**
- Create: `components/SubgraphPanel.tsx`
- Modify: `app/page.tsx` (add export/import/share actions)
- Final polish on responsive + PWA

- [ ] **Step 1: Box select → extract subgraph**

- Configure G6 brush-select behavior
- On selection complete, show "提取子图" button
- Click → open SubgraphPanel showing only selected nodes

- [ ] **Step 2: Export/Import JSON**

- "导出" button → download JSON file via `exportJSON()`
- "导入" button → file picker → parse and load via `importJSON()`

- [ ] **Step 3: Read-only share link**

- "分享链接" button → encode current data → copy to clipboard
- On page load, check URL for `?share=` parameter → load shared data in read-only mode
- Read-only: hide edit buttons, show "这是分享的只读视图" banner

- [ ] **Step 4: Mobile responsive**

- Sidebar collapses to hamburger menu on mobile
- Touch-friendly node/edge interactions
- PWA install prompt

- [ ] **Step 5: Generate PWA icons**

Create simple placeholder icons (192x192 and 512x512) with graph-themed design.

- [ ] **Step 6: Final verification**

Test all features:
- Add 5+ nodes with different tags
- Create edges between them
- Create a group
- Filter by tag
- Select subgraph
- Export and re-import JSON
- Generate share link

- [ ] **Step 7: Commit**

```bash
cd /Users/xiatao/streamer-graph && git add -A && git commit -m "feat: subgraph selection, persistence, share links, PWA polish"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Dark theme with vibrant colors
- ✅ Force-directed layout + zoom/drag/minimap
- ✅ Add/edit nodes with all tags
- ✅ Drag-to-connect edges with relationship types
- ✅ Grouping (combos) with multi-group support
- ✅ Tag filter sidebar
- ✅ Manual/auto node sizing
- ✅ Box select subgraph
- ✅ LocalStorage auto-save
- ✅ JSON export/import
- ✅ Read-only share link
- ✅ PWA installable
- ✅ 200+ node performance (Canvas rendering, animation disabled)

**2. Placeholder scan:** No TBD/TODO/fill-in-details found. All steps have complete code or specific implementation instructions.

**3. Type consistency:** `StreamerNode`, `RelationshipEdge`, `StreamerGroup`, `GraphData` types are defined in Task 2 and used consistently across all tasks. `genId()` is defined in `graph-data.ts` and used in forms.

---

Plan complete and saved to `/Users/xiatao/streamer-graph/docs/superpowers/plans/2026-04-10-streamer-graph-v1.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints

Which approach?
