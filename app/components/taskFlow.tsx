// components/TaskFlow.tsx
'use client';

import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FlowchartGraph } from '@/core/plugins/taskFlow/schema';
import { getLayoutedElements } from '@/lib/flowchart/layout'; // 引入布局函数

interface TaskFlowProps {
  tf: FlowchartGraph | null;
}

// 颜色映射
const nodeColorMap: Record<string, string> = {
  start: '#4ade80',   
  end: '#f87171',     
  task: '#60a5fa',    
  decision: '#fbbf24',
  io: '#c084fc',      
  parallel: '#94a3b8',
  subprocess: '#fb923c',
};

export function TaskFlow({ tf }: TaskFlowProps) {
  // 转换数据并计算布局
  const { initialNodes, initialEdges } = useMemo<{
    initialNodes: Node[];
    initialEdges: Edge[];
  }>(() => {
    if (!tf) return { initialNodes: [], initialEdges: [] };

    // 1. 使用业务节点/边做布局计算
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      tf.nodes,
      tf.edges,
      'TB' // 从上到下
    );

    // 2. 将布局后的业务节点映射为 React Flow 节点
    const reactNodes: Node[] = layoutedNodes.map((node) => ({
      id: node.id,
      type: 'default',
      position: node.position,
      sourcePosition: node.sourcePosition,
      targetPosition: node.targetPosition,
      data: {
        label: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>{node.label}</span>
            {node.metadata?.description && (
              <span style={{ fontSize: '10px', opacity: 0.8 }}>{node.metadata.description}</span>
            )}
          </div>
        ),
        status: node.status,
      },
      style: {
        background: nodeColorMap[node.type] || '#fff',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '160px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        textAlign: 'center',
        fontSize: '14px',
      },
    }));

    // 3. 将业务边映射为 React Flow 边
    const reactEdges: Edge[] = layoutedEdges.map((edge) => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      labelStyle: { fill: '#64748b', fontWeight: 700, fontSize: 12 },
      labelBgStyle: { fill: '#fff' },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
    }));

    return { initialNodes: reactNodes, initialEdges: reactEdges };
  }, [tf]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 数据变化时更新
  useEffect(() => {
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
    <div style={{ width: '100%', height: '500px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} />
        <MiniMap 
          nodeStrokeColor={(n) => nodeColorMap[n.data?.status as string] || '#555'} 
          nodeColor={(n) => nodeColorMap[n.data?.status as string] || '#eee'}
          maskColor="rgba(240, 240, 240, 0.6)"
          zoomable 
          pannable 
        />
      </ReactFlow>
    </div>
  );
}