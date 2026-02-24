// lib/flowchart/layout.ts
import dagre from 'dagre';
import { FlowchartNode, FlowchartEdge } from '@/core/plugins/taskFlow/schema';

// 🔥 增加节点尺寸，给文字更多空间
const nodeWidth = 220;  // 之前是 172
const nodeHeight = 80;  // 之前是 36 (因为你有描述文字，高度要给够)

export function getLayoutedElements(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[],
  direction = 'TB'
) {
  const isHorizontal = direction === 'LR';
  const dagreGraph = new dagre.graphlib.Graph();
  
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // 🔥 关键配置：调整间距
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 100,  // 🔥 行与行之间的距离 (默认 50)，调大让上下更宽松
    nodesep: 50,   // 🔥 同一行节点之间的距离 (默认 50)
    edgesep: 30,   // 边与边之间的距离
  });

  // 添加节点
  for (const node of nodes) {
    // 根据内容动态估算高度，或者直接使用固定的较大值
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: nodeHeight 
    });
  }

  // 添加边
  for (const edge of edges) {
    dagreGraph.setEdge(edge.from, edge.to);
  }

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}