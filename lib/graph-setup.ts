import { Graph } from '@antv/g6';
import { RELATIONSHIP_CONFIG, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, IDENTITY_SIZE, GROUP_COLORS, GROUP_BORDER_COLORS } from './constants';
import { GraphData, StreamerNode, RelationshipEdge, StreamerGroup } from './types';

// Compute node degree for auto-sizing
function computeNodeDegrees(data: GraphData): Record<string, number> {
  const degrees: Record<string, number> = {};
  data.nodes.forEach(n => { degrees[n.id] = 0; });
  data.edges.forEach(e => {
    degrees[e.source] = (degrees[e.source] || 0) + 1;
    degrees[e.target] = (degrees[e.target] || 0) + 1;
  });
  return degrees;
}

// Map degree to size range [36, 70]
function degreeToSize(degree: number, maxDegree: number): number {
  if (maxDegree === 0) return 40;
  const minSize = 36;
  const maxSize = 70;
  return minSize + (degree / maxDegree) * (maxSize - minSize);
}

// Calculate combo bounds from member node positions
function calcComboBounds(memberIds: string[], positions: Record<string, { x: number; y: number }>) {
  const pts = memberIds.map(id => positions[id]).filter(Boolean);
  if (pts.length === 0) return { x: 0, y: 0, rw: 120, rh: 120 };
  const pad = 70;
  const xs = pts.map(p => p.x);
  const ys = pts.map(p => p.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    rw: Math.max(maxX - minX, 120),
    rh: Math.max(maxY - minY, 120),
  };
}

// Convert app data to G6 v5 data format
export function toG6Data(data: GraphData, sizeMode: 'manual' | 'auto' = 'manual', positions?: Record<string, { x: number; y: number }>, showAnnotations?: boolean, annotationFields?: string[]) {
  const degrees = computeNodeDegrees(data);
  const maxDegree = Math.max(1, ...Object.values(degrees));
  const pos = positions || {};

  const nodes = data.nodes.map((node: StreamerNode) => {
    const mainCategory = node.tags.categories[0] || '';
    const color = node.customColor || CATEGORY_COLORS[mainCategory] || DEFAULT_CATEGORY_COLOR;

    // Base size from identity level or auto mode
    let size: number;
    if (sizeMode === 'auto') {
      size = degreeToSize(degrees[node.id] || 0, maxDegree);
    } else {
      size = node.customSize || IDENTITY_SIZE[node.identityLevel] || 36;
    }

    // Expand node to fit name (each Chinese char ~12px at fontSize 11)
    const nameLen = node.name.length;
    const neededForName = nameLen * 12 + 16;
    if (neededForName > size) size = neededForName;
    if (size > 90) size = 90;

    const fontSize = size >= 56 ? 12 : size >= 40 ? 11 : 10;

    // Build annotation badges
    const badges: any[] = [];
    if (showAnnotations) {
      let badgeText = '';
      if (node.customAnnotation) {
        badgeText = node.customAnnotation.length > 12 ? node.customAnnotation.slice(0, 12) + '…' : node.customAnnotation;
      } else if (annotationFields && annotationFields.length > 0) {
        const parts: string[] = [];
        annotationFields.forEach(field => {
          if (field === 'categories' && node.tags.categories[0]) parts.push(node.tags.categories[0]);
          else if (field === 'regions' && node.tags.regions[0]) parts.push(node.tags.regions[0]);
          else if (field === 'talents' && node.tags.talents[0]) parts.push(node.tags.talents[0]);
          else if (field === 'sections' && node.tags.sections[0]) parts.push(node.tags.sections[0]);
          else if (field === 'notes' && node.notes) parts.push(node.notes.length > 8 ? node.notes.slice(0, 8) + '…' : node.notes);
        });
        badgeText = parts.join(' · ');
      }
      if (badgeText) {
        const badgeBg = color + '33';
        badges.push({
          text: badgeText,
          placement: 'bottom' as const,
          offsetY: 8,
          fill: '#e0e0e0',
          fontSize: 10,
          backgroundFill: badgeBg,
          backgroundStroke: color,
          backgroundLineWidth: 1,
          backgroundRadius: '4',
          backgroundOpacity: 1,
          padding: [3, 8, 3, 8],
        });
      }
    }

    return {
      id: node.id,
      // No combo binding — nodes are free-floating
      style: {
        size,
        fill: color,
        stroke: color,
        lineWidth: 2,
        fillOpacity: 0.9,
        labelText: node.name,
        labelFill: '#ffffff',
        labelFontSize: fontSize,
        labelFontWeight: 'bold' as const,
        labelPlacement: 'center' as const,
        labelOffsetY: 0,
        ...(badges.length > 0 ? { badges } : {}),
        ...(pos[node.id] ? { x: pos[node.id].x, y: pos[node.id].y } : {}),
      },
      data: { _originalData: node },
    };
  });

  const edges = data.edges.map((edge: RelationshipEdge) => {
    const config = RELATIONSHIP_CONFIG[edge.type] || RELATIONSHIP_CONFIG.custom;
    const arrow = edge.type === 'mentor' || edge.type === 'betrayed';
    const displayLabel = edge.label || config.label;

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      style: {
        stroke: config.color,
        lineWidth: config.width || 1.5,
        lineDash: config.lineStyle === 'dashed' ? [6, 4] : config.lineStyle === 'dotted' ? [2, 2] : undefined,
        endArrow: arrow,
        labelText: displayLabel,
        labelFill: config.color,
        labelFontSize: 9,
        labelFillOpacity: 0.85,
        labelOffsetY: -10,
        labelBackgroundFill: '#0f0f1a',
        labelBackgroundRadius: 2,
        labelBackgroundPadding: [2, 4],
      },
      data: { _originalData: edge },
    };
  });

  // Combos: calculated from member positions, not bound to nodes
  const combos = data.groups.map((group: StreamerGroup, index: number) => {
    const colorIndex = index % GROUP_COLORS.length;
    const bounds = calcComboBounds(group.memberIds, pos);
    return {
      id: group.id,
      style: {
        x: bounds.x,
        y: bounds.y,
        size: Math.max(bounds.rw, bounds.rh),
        fill: GROUP_COLORS[colorIndex],
        stroke: GROUP_BORDER_COLORS[colorIndex],
        lineWidth: 2,
        lineDash: [4, 4],
        fillOpacity: 1,
        labelText: group.name,
        labelFill: GROUP_BORDER_COLORS[colorIndex].replace('0.6', '1'),
        labelFontSize: 13,
        labelFontWeight: 'bold' as const,
        labelPlacement: 'top' as const,
      },
      data: { _originalData: group },
    };
  });

  return { nodes, edges, combos };
}

// Create configured G6 v5 graph instance
export function createGraph(container: HTMLElement, skipLayout = false) {
  const graph = new Graph({
    container,
    autoFit: 'view',
    padding: [30, 30, 30, 30],
    animation: false,
    devicePixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2,
    node: {
      type: 'circle',
      state: {
        highlight: {
          fillOpacity: 1,
          strokeOpacity: 1,
          lineWidth: 3,
        },
        dim: {
          fillOpacity: 0.05,
          strokeOpacity: 0.05,
          labelFillOpacity: 0.05,
        },
        selected: {
          lineWidth: 4,
          stroke: '#00ff88',
          strokeOpacity: 1,
          shadowColor: '#00ff88',
          shadowBlur: 20,
        },
      },
    },
    edge: {
      type: 'line',
      state: {
        highlight: {
          strokeOpacity: 1,
          lineWidth: 3,
          labelFillOpacity: 1,
        },
        dim: {
          strokeOpacity: 0.05,
          labelFillOpacity: 0.05,
        },
        selected: {
          lineWidth: 3,
          strokeOpacity: 1,
        },
      },
    },
    combo: {
      type: 'circle',
    },
    ...(skipLayout ? {} : {
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSize: 60,
        linkDistance: 150,
        nodeStrength: -300,
      },
    }),
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
  });

  return graph;
}
