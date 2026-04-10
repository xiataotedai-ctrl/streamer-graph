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

// Convert app data to G6 v5 data format
export function toG6Data(data: GraphData, sizeMode: 'manual' | 'auto' = 'manual', positions?: Record<string, { x: number; y: number }>) {
  const degrees = computeNodeDegrees(data);
  const maxDegree = Math.max(1, ...Object.values(degrees));

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
    // Cap at reasonable max
    if (size > 90) size = 90;

    const comboId = node.groupIds?.[0] || node.groupId || undefined;

    // Font size scales with node size and name length
    const fontSize = size >= 56 ? 12 : size >= 40 ? 11 : 10;

    return {
      id: node.id,
      ...(comboId ? { combo: comboId } : {}),
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
        // Preserve position from previous layout
        ...(positions?.[node.id] ? { x: positions[node.id].x, y: positions[node.id].y } : {}),
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

  const combos = data.groups.map((group: StreamerGroup, index: number) => {
    const colorIndex = index % GROUP_COLORS.length;
    return {
      id: group.id,
      style: {
        fill: GROUP_COLORS[colorIndex],
        stroke: GROUP_BORDER_COLORS[colorIndex],
        lineWidth: 2,
        lineDash: [4, 4],
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
    node: {
      type: 'circle',
      state: {
        highlight: {
          fillOpacity: 1,
          strokeOpacity: 1,
          lineWidth: 3,
        },
        dim: {
          fillOpacity: 0.12,
          strokeOpacity: 0.12,
          labelFillOpacity: 0.12,
        },
        selected: {
          lineWidth: 3,
          stroke: '#ffffff',
          strokeOpacity: 1,
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
    // Only run force layout when no saved positions exist
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
