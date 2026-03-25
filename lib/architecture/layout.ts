// lib/architecture/layout.ts
import dagre from 'dagre';
import { Position, XYPosition } from '@xyflow/react';
import type { ArchitectureComponent, ArchitectureConnection } from '@/core/types';

// 与 ArchitectureFlow 中卡片的实际视觉尺寸保持一致，避免 dagre 低估节点占位，
// 导致布局结果过于紧凑。
const nodeWidth = 320;
const nodeHeight = 140;

// LayoutedComponent 在原始架构组件的基础上补充了 React Flow 所需的位置
// 和连线方向信息，供渲染层直接使用。
export type LayoutedComponent = ArchitectureComponent & {
  position: XYPosition;
  sourcePosition: Position;
  targetPosition: Position;
};

// 使用 dagre 进行通用自动布局。
// 这是默认布局策略，适合需要结合边关系自动分层和避让的场景。
export function getLayoutedArchitecture(
  components: ArchitectureComponent[],
  connections: ArchitectureConnection[],
  direction: 'TB' | 'LR' = 'TB'
): { components: LayoutedComponent[]; connections: ArchitectureConnection[] } {
  const isHorizontal = direction === 'LR';
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // 放大层间距、节点间距和边间距，提升复杂架构图的可读性。
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 260,
    nodesep: 180,
    edgesep: 100,
    marginx: 40,
    marginy: 40,
  });

  // 将每个架构组件注册为 dagre 节点，并提供固定尺寸用于布局计算。
  for (const comp of components) {
    dagreGraph.setNode(comp.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  }

  // 注册有向边，让 dagre 能根据连接关系做分层并尽量减少交叉。
  for (const conn of connections) {
    dagreGraph.setEdge(conn.from, conn.to);
  }

  dagre.layout(dagreGraph);

  // dagre 返回的是节点中心点坐标，而 React Flow 需要左上角坐标，
  // 这里做一次坐标系转换。
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

// 按架构层做确定性的分层布局。
// 这个方案不追求全局最优连线，而是优先保证不同层级上下分区清晰。
export function getLayeredLayout(
  components: ArchitectureComponent[],
  connections: ArchitectureConnection[]
): { components: LayoutedComponent[]; connections: ArchitectureConnection[] } {
  const layerOrder = ['presentation', 'application', 'domain', 'infrastructure', 'data'];

  // 先按 layer 分桶，后续每个 layer 占据自己的一行。
  const layers = new Map<string, ArchitectureComponent[]>();
  for (const comp of components) {
    const layer = comp.layer || 'application';
    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer)!.push(comp);
  }

  const layoutedComponents: LayoutedComponent[] = [];
  let yOffset = 0;

  // 按既定层级顺序从上到下摆放，每一层内部从左到右展开节点。
  for (const layerName of layerOrder) {
    const layerComps = layers.get(layerName);
    if (!layerComps || layerComps.length === 0) continue;

    const layerHeight = layerComps.length * (nodeHeight + 60);
    let xOffset = 100;

    for (const comp of layerComps) {
      layoutedComponents.push({
        ...comp,
        position: { x: xOffset, y: yOffset },
        targetPosition: 'top' as Position,
        sourcePosition: 'bottom' as Position,
      });
      xOffset += nodeWidth + 120;
    }

    yOffset += layerHeight + 120;
  }

  return { components: layoutedComponents, connections };
}
