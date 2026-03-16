import type { ArchitectureJson, WbsGraph } from '@/core/types';
import type { FlowchartGraph, FlowchartNode, FlowchartEdge } from '@/core/plugins/taskFlow/schema';

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

function toFlowNodeStatus(component: ArchitectureJson['components'][number]): FlowchartNode['status'] {
  return architectureComponentHasRisk(component) ? 'blocked' : 'todo';
}

function architectureComponentHasRisk(component: ArchitectureJson['components'][number]): boolean {
  const featureCount = component.metadata?.features?.length ?? 0;
  return component.type === 'external-api' || featureCount >= 5;
}

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
