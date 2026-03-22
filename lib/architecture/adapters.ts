import type React from 'react';
import type { ArchitectureJson, ArchitectureComponent, ArchitectureConnection, ArchitectureLayer, ArchitectureComponentType, WbsGraph } from '@/core/types';
import type { FlowchartGraph, FlowchartNode, FlowchartEdge } from '@/core/plugins/taskFlow/schema';
import type { Node, Edge } from '@xyflow/react';

const WBS_TYPE_BY_LAYER: Record<ArchitectureJson['components'][number]['layer'], WbsGraph['nodes'][number]['type']> = {
  presentation: 'goal',
  application: 'milestone',
  domain: 'task',
  infrastructure: 'subtask',
  data: 'subtask',
};

const FLOW_NODE_TYPE_BY_COMPONENT: Record<ArchitectureJson['components'][number]['type'], FlowchartNode['type']> = {
  frontend: 'start',
  backend: 'task',
  database: 'io',
  cache: 'io',
  queue: 'parallel',
  'api-gateway': 'decision',
  'auth-service': 'subprocess',
  storage: 'io',
  cdn: 'io',
  'external-api': 'end',
};

/**
 * 按架构层顺序对组件进行排序。
 * 排序优先级：presentation > application > domain > infrastructure > data。
 * @param architecture - 架构数据对象
 * @returns 排序后的组件数组
 */
function sortComponentsForViews(architecture: ArchitectureJson) {
  const layerOrder: Record<ArchitectureJson['components'][number]['layer'], number> = {
    presentation: 0,
    application: 1,
    domain: 2,
    infrastructure: 3,
    data: 4,
  };

  return [...architecture.components].sort((a, b) => {
    const layerDiff = layerOrder[a.layer] - layerOrder[b.layer];
    if (layerDiff !== 0) return layerDiff;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

/**
 * 将架构组件转换为流程图节点状态。
 * 如果组件存在风险（如外部 API 或功能过多），返回 blocked 状态。
 * @param component - 架构组件
 * @returns 流程图节点状态
 */
function toFlowNodeStatus(component: ArchitectureJson['components'][number]): FlowchartNode['status'] {
  return architectureComponentHasRisk(component) ? 'blocked' : 'todo';
}

/**
 * 判断架构组件是否存在风险。
 * 外部 API 或功能数量超过 5 个的组件被视为高风险。
 * @param component - 架构组件
 * @returns 如果存在风险返回 true
 */
function architectureComponentHasRisk(component: ArchitectureJson['components'][number]): boolean {
  const featureCount = component.metadata?.features?.length ?? 0;
  return component.type === 'external-api' || featureCount >= 5;
}

/**
 * 查找组件的父节点 ID。
 * 根据架构层顺序，返回上层组件的 ID。
 * @param component - 当前组件
 * @param ordered - 已排序的组件数组
 * @returns 父节点 ID，没有时返回 null
 */
function findParentId(
  component: ArchitectureJson['components'][number],
  ordered: ArchitectureJson['components'],
): string | null {
  const sameLayerIndex = ordered.findIndex((item) => item.id === component.id);
  if (sameLayerIndex <= 0) return null;

  const currentLayerRank = ordered[sameLayerIndex]?.layer;
  const layerRank: Record<ArchitectureJson['components'][number]['layer'], number> = {
    presentation: 0,
    application: 1,
    domain: 2,
    infrastructure: 3,
    data: 4,
  };

  for (let index = sameLayerIndex - 1; index >= 0; index -= 1) {
    const candidate = ordered[index];
    if (layerRank[candidate.layer] < layerRank[currentLayerRank]) {
      return candidate.id;
    }
  }

  return ordered[0]?.id ?? null;
}

/**
 * 将架构数据转换为 WBS 视图格式。
 * @param architecture - 架构数据对象
 * @returns WBS 图数据
 */
export function architectureToWbsView(architecture: ArchitectureJson): WbsGraph {
  const ordered = sortComponentsForViews(architecture);

  const nodes: WbsGraph['nodes'] = ordered.map((component) => ({
    id: component.id,
    title: component.name,
    type: WBS_TYPE_BY_LAYER[component.layer],
    status: 'todo',
    parentId: findParentId(component, ordered),
    dependsOn: architecture.connections
      .filter((connection) => connection.to === component.id)
      .map((connection) => connection.from),
    notes: [
      component.description,
      component.technology ? `Tech: ${component.technology}` : undefined,
    ].filter((value): value is string => Boolean(value)),
  }));

  const edges: WbsGraph['edges'] = [];
  for (const node of nodes) {
    if (node.parentId) {
      edges.push({ from: node.parentId, to: node.id, type: 'parent' });
    }
  }

  for (const connection of architecture.connections) {
    edges.push({ from: connection.from, to: connection.to, type: 'dependency' });
  }

  return {
    version: 'wbs.v1',
    goal: architecture.title,
    nodes,
    edges,
    updates: {
      addedNodeIds: architecture.updates.addedComponentIds,
      updatedNodeIds: architecture.updates.updatedComponentIds,
      removedNodeIds: architecture.updates.removedComponentIds,
    },
  };
}

/**
 * 将架构数据转换为任务流程图视图格式。
 * @param architecture - 架构数据对象
 * @returns 流程图数据
 */
export function architectureToTaskFlowView(architecture: ArchitectureJson): FlowchartGraph {
  const ordered = sortComponentsForViews(architecture);

  const nodes: FlowchartGraph['nodes'] = ordered.map((component) => ({
    id: component.id,
    label: component.name,
    type: FLOW_NODE_TYPE_BY_COMPONENT[component.type],
    status: toFlowNodeStatus(component),
    metadata: {
      description: [component.description, component.technology].filter(Boolean).join(' | ') || undefined,
    },
  }));

  const edges: FlowchartEdge[] = architecture.connections.map((connection) => ({
    from: connection.from,
    to: connection.to,
    label: connection.label,
    type: connection.type === 'queue' ? 'parallel' : connection.type === 'http' || connection.type === 'websocket' ? 'sequence' : 'condition',
  }));

  return {
    version: 'flowchart.v1',
    title: architecture.title,
    nodes,
    edges,
    updates: {
      addedNodeIds: architecture.updates.addedComponentIds,
      updatedNodeIds: architecture.updates.updatedComponentIds,
      removedNodeIds: architecture.updates.removedComponentIds,
      addedEdgeIds: architecture.updates.addedConnectionIds,
      removedEdgeIds: architecture.updates.removedConnectionIds,
    },
  };
}

// ============================================================================
// 反向转换：React Flow → ArchitectureJson
// ============================================================================

/** React Flow 节点数据类型 */
interface ArchitectureNodeData {
  name?: string;
  type?: ArchitectureComponentType;
  layer?: ArchitectureLayer;
  description?: string;
  technology?: string;
  label?: React.ReactNode;
}

/**
 * 从 React Flow 节点和边转换回 ArchitectureJson
 *
 * @param nodes - React Flow 节点数组
 * @param edges - React Flow 边数组
 * @param originalArchitecture - 原始架构数据（用于保留非编辑字段如 techStack、decisions）
 * @returns 更新后的 ArchitectureJson
 */
export function flowToArchitecture(
  nodes: Node[],
  edges: Edge[],
  originalArchitecture: ArchitectureJson,
): ArchitectureJson {
  // 转换节点 → 组件
  const components: ArchitectureComponent[] = nodes.map((node) => {
    const data = node.data as ArchitectureNodeData;
    const originalComponent = originalArchitecture.components.find((c) => c.id === node.id);

    return {
      id: node.id,
      name: data.name || originalComponent?.name || node.id,
      type: data.type ?? originalComponent?.type ?? 'backend',
      layer: data.layer ?? originalComponent?.layer ?? 'application',
      description: data.description ?? originalComponent?.description,
      technology: data.technology ?? originalComponent?.technology,
      metadata: originalComponent?.metadata,
    };
  });

  // 转换边 → 连接
  const connections: ArchitectureConnection[] = edges.map((edge) => {
    const originalConnection = originalArchitecture.connections.find(
      (c) => c.id === edge.id || (c.from === edge.source && c.to === edge.target),
    );

    return {
      id: edge.id,
      from: edge.source,
      to: edge.target,
      type: (edge.data?.type as ArchitectureConnection['type']) ?? originalConnection?.type ?? 'http',
      label: edge.label?.toString() ?? originalConnection?.label,
      description: originalConnection?.description,
    };
  });

  // 计算变更追踪
  const originalComponentIds = new Set(originalArchitecture.components.map((c) => c.id));
  const newComponentIds = new Set(components.map((c) => c.id));
  const originalConnectionIds = new Set(originalArchitecture.connections.map((c) => c.id));

  const addedComponentIds = components.filter((c) => !originalComponentIds.has(c.id)).map((c) => c.id);
  const removedComponentIds = originalArchitecture.components.filter((c) => !newComponentIds.has(c.id)).map((c) => c.id);
  const updatedComponentIds = components.filter((c) => {
    if (!originalComponentIds.has(c.id)) return false;
    const original = originalArchitecture.components.find((o) => o.id === c.id);
    return original && (
      original.name !== c.name ||
      original.type !== c.type ||
      original.layer !== c.layer ||
      original.description !== c.description ||
      original.technology !== c.technology
    );
  }).map((c) => c.id);

  const addedConnectionIds = connections.filter((c) => !originalConnectionIds.has(c.id)).map((c) => c.id);
  const removedConnectionIds = originalArchitecture.connections.filter((c) => !connections.some((nc) => nc.id === c.id)).map((c) => c.id);

  return {
    ...originalArchitecture,
    components,
    connections,
    updates: {
      addedComponentIds,
      updatedComponentIds,
      removedComponentIds,
      addedConnectionIds,
      removedConnectionIds,
    },
  };
}
