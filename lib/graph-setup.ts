import { Graph } from '@antv/g6';
import { RELATIONSHIP_CONFIG, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, IDENTITY_SIZE, GROUP_COLORS, GROUP_BORDER_COLORS } from './constants';
import { GraphData, StreamerNode, RelationshipEdge, StreamerGroup } from './types';

// Convert app data to G6 v5 data format
export function toG6Data(data: GraphData) {
  const nodes = data.nodes.map((node: StreamerNode) => {
    const mainCategory = node.tags.categories[0] || '';
    const color = CATEGORY_COLORS[mainCategory] || DEFAULT_CATEGORY_COLOR;
    const size = node.customSize || IDENTITY_SIZE[node.identityLevel] || 30;
    const comboId = node.groupIds?.[0] || node.groupId || undefined;

    return {
      id: node.id,
      ...(comboId ? { combo: comboId } : {}),
      style: {
        size,
        fill: color,
        stroke: color,
        lineWidth: 2,
        fillOpacity: 0.85,
        labelText: node.name,
        labelFill: '#e0e0e0',
        labelFontSize: 11,
        labelPlacement: 'bottom' as const,
        labelOffsetY: size / 2 + 6,
        haloR: size / 2 + 4,
        haloStroke: color,
        haloLineWidth: 1,
        haloStrokeOpacity: 0.3,
      },
      data: { _originalData: node },
    };
  });

  const edges = data.edges.map((edge: RelationshipEdge) => {
    const config = RELATIONSHIP_CONFIG[edge.type] || RELATIONSHIP_CONFIG.custom;
    const arrow = edge.type === 'mentor' || edge.type === 'betrayed';

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      style: {
        stroke: config.color,
        lineWidth: config.width || 1.5,
        lineDash: config.lineStyle === 'dashed' ? [6, 4] : config.lineStyle === 'dotted' ? [2, 2] : undefined,
        endArrow: arrow,
        labelText: config.label,
        labelFill: config.color,
        labelFontSize: 9,
        labelFillOpacity: 0.8,
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
export function createGraph(container: HTMLElement) {
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
          haloStrokeOpacity: 0.6,
        },
        dim: {
          fillOpacity: 0.12,
          strokeOpacity: 0.12,
          labelFillOpacity: 0.12,
          haloStrokeOpacity: 0,
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
      },
    },
    combo: {
      type: 'circle',
    },
    layout: {
      type: 'force',
      preventOverlap: true,
      nodeSize: 60,
      linkDistance: (d: any) => {
        // Longer distance for edges without combos
        return 150;
      },
      nodeStrength: -300,
    },
    behaviors: [
      'drag-canvas',
      'zoom-canvas',
      'drag-element',
      'hover-activate',
      { type: 'brush-select', trigger: 'shift' },
      { type: 'create-edge', trigger: 'drag', key: 'create-edge' },
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
