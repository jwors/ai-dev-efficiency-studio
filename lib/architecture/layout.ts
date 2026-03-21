// lib/architecture/layout.ts
import dagre from 'dagre';
import { Position, XYPosition } from '@xyflow/react';
import type { ArchitectureComponent, ArchitectureConnection } from '@/core/types';

const nodeWidth = 240;
const nodeHeight = 100;

/** 布局后的组件类型，包含位置信息 */
export type LayoutedComponent = ArchitectureComponent & {
  position: XYPosition;
  sourcePosition: Position;
  targetPosition: Position;
};

/**
 * 使用 dagre 算法对架构图元素进行自动布局。
 * 支持按架构层分层布局。
 */
export function getLayoutedArchitecture(
  components: ArchitectureComponent[],
  connections: ArchitectureConnection[],
  direction: 'TB' | 'LR' = 'TB'
): { components: LayoutedComponent[]; connections: ArchitectureConnection[] } {
  const isHorizontal = direction === 'LR';
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 120,
    nodesep: 60,
    edgesep: 40,
  });

  // 添加组件节点
  for (const comp of components) {
    dagreGraph.setNode(comp.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  }

  // 添加连接边
  for (const conn of connections) {
    dagreGraph.setEdge(conn.from, conn.to);
  }

  dagre.layout(dagreGraph);

  const layoutedComponents: LayoutedComponent[] = components.map((comp) => {
    const nodeWithPosition = dagreGraph.node(comp.id);
    return {
      ...comp,
      targetPosition: (isHorizontal ? 'left' : 'top') as Position,
      sourcePosition: (isHorizontal ? 'right' : 'bottom') as Position,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { components: layoutedComponents, connections };
}

/**
 * 按架构层分组计算布局。
 * 组件按 presentation、application、domain、infrastructure、data 的顺序从上到下排列。
 * @param components - 架构组件数组
 * @param connections - 架构连接数组
 * @returns 包含位置信息的布局后组件和连接
 */
export function getLayeredLayout(
  components: ArchitectureComponent[],
  connections: ArchitectureConnection[]
): { components: LayoutedComponent[]; connections: ArchitectureConnection[] } {
  const layerOrder = ['presentation', 'application', 'domain', 'infrastructure', 'data'];

  // 按层分组
  const layers = new Map<string, ArchitectureComponent[]>();
  for (const comp of components) {
    const layer = comp.layer || 'application';
    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer)!.push(comp);
  }

  // 为每个组件分配位置
  const layoutedComponents: LayoutedComponent[] = [];
  let yOffset = 0;

  for (const layerName of layerOrder) {
    const layerComps = layers.get(layerName);
    if (!layerComps || layerComps.length === 0) continue;

    const layerHeight = layerComps.length * (nodeHeight + 40);
    let xOffset = 100;

    for (const comp of layerComps) {
      layoutedComponents.push({
        ...comp,
        position: { x: xOffset, y: yOffset },
        targetPosition: 'top' as Position,
        sourcePosition: 'bottom' as Position,
      });
      xOffset += nodeWidth + 60;
    }

    yOffset += layerHeight + 80;
  }

  return { components: layoutedComponents, connections };
}