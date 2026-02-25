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