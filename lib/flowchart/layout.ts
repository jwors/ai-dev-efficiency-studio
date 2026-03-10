// lib/flowchart/layout.ts
import dagre from 'dagre';
import { Position, XYPosition } from '@xyflow/react';
import { FlowchartNode, FlowchartEdge } from '@/core/plugins/taskFlow/schema';

// 增加节点尺寸，给文字更多空间
const nodeWidth = 220;
const nodeHeight = 80;

type LayoutedFlowchartNode = FlowchartNode & {
  position: XYPosition;
  sourcePosition: Position;
  targetPosition: Position;
};

/**
 * 使用 dagre 算法对流程图元素进行自动布局。
 * 支持自上而下 (TB) 或从左到右 (LR) 的布局方向。
 * @param nodes - 流程图节点数组
 * @param edges - 流程图边数组
 * @param direction - 布局方向，默认为 'TB'（从上到下）
 * @returns 包含位置信息的布局后节点和边
 */
export function getLayoutedElements(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: LayoutedFlowchartNode[]; edges: FlowchartEdge[] } {
  const isHorizontal = direction === 'LR';
  const dagreGraph = new dagre.graphlib.Graph();

  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // 关键配置：调整间距
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 100, // 行与行之间的距离
    nodesep: 50,  // 同一行节点之间的距离
    edgesep: 30,  // 边与边之间的距离
  });

  // 添加节点
  for (const node of nodes) {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  }

  // 添加边
  for (const edge of edges) {
    dagreGraph.setEdge(edge.from, edge.to);
  }

  dagre.layout(dagreGraph);

  const layoutedNodes: LayoutedFlowchartNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: (isHorizontal ? 'left' : 'top') as Position,
      sourcePosition: (isHorizontal ? 'right' : 'bottom') as Position,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}