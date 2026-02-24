// components/TaskFlow.tsx
'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // 引入基础样式

import { FlowchartGraph } from '@/core/plugins/taskFlow/schema';

interface TaskFlowProps {
  tf: FlowchartGraph | null;
}

// 自定义节点样式映射 (可选)
const nodeColorMap: Record<string, string> = {
  start: '#4ade80',   // 绿色
  end: '#f87171',     // 红色
  task: '#60a5fa',    // 蓝色
  decision: '#fbbf24',// 黄色
  io: '#c084fc',      // 紫色
  parallel: '#94a3b8',// 灰色
  subprocess: '#fb923c',// 橙色
};

export function TaskFlow({ tf }: TaskFlowProps) {
  // 将 FlowchartGraph 转换为 React Flow 数据
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!tf) return { initialNodes: [], initialEdges: [] };

    const nodes = tf.nodes.map((node:any) => ({
      id: node.id,
      type: 'default', // 使用默认节点类型，也可以自定义
      position: { x: 0, y: 0 }, // React Flow 会自动布局，这里先给个默认值
      data: { 
        label: node.label,
        description: node.metadata?.description,
        status: node.status,
      },
      style: {
        background: nodeColorMap[node.type] || '#fff',
        color: '#fff',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontWeight: 'bold',
      },
    }));

    const edges = tf.edges.map((edge:any) => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'smoothstep', // 平滑折线，比直线好看
      animated: true,     // 添加流动动画
      style: { stroke: '#555', strokeWidth: 2 },
      labelStyle: { fill: '#555', fontWeight: 700, fontSize: 12 },
      labelBgStyle: { fill: '#fff' },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [tf]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 当数据变化时，更新节点和边
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!tf) {
    return (
      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        No task flow generated yet. Please run a task.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '500px', border: '1px solid #eee', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
        <MiniMap 
          nodeStrokeColor={(n) => nodeColorMap[n.data?.status as string] || '#555'} 
          zoomable 
          pannable 
        />
      </ReactFlow>
    </div>
  );
}