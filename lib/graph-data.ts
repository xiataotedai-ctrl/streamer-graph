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

export function updateEdge(graph: GraphData, edgeId: string, updates: Partial<RelationshipEdge>): GraphData {
  return {
    ...graph,
    edges: graph.edges.map(e => e.id === edgeId ? { ...e, ...updates } : e),
    metadata: { ...graph.metadata, updatedAt: new Date().toISOString() },
  };
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
