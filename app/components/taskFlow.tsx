'use client';

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  BackgroundVariant,
  Node,
  Edge,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';

// ⚠️ 请根据你的实际项目结构确认以下路径
import { FlowchartGraph } from '@/core/plugins/taskFlow/schema';
import { getLayoutedElements } from '@/lib/flowchart/layout'; 

interface TaskFlowProps {
  tf: FlowchartGraph | null;
}

const nodeColorMap: Record<string, string> = {
  start: '#4ade80',   
  end: '#f87171',     
  task: '#60a5fa',    
  decision: '#fbbf24',
  io: '#c084fc',      
  parallel: '#94a3b8',
  subprocess: '#fb923c',
  default: '#60a5fa',
};

export function TaskFlow({ tf }: TaskFlowProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 1. 数据转换与布局计算
  const { initialNodes, initialEdges } = useMemo<{
    initialNodes: Node[];
    initialEdges: Edge[];
  }>(() => {
    // 🔒 防御性检查：如果 tf 或 nodes 不存在，返回空数组
    if (!tf || !Array.isArray(tf.nodes) || tf.nodes.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    try {
      const safeEdges = Array.isArray(tf.edges) ? tf.edges : [];

      // 1. 使用业务节点/边做布局计算
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        tf.nodes,
        safeEdges,
        'LR',
      );

      // 2. 将布局后的业务节点映射为 React Flow 节点
      const initialNodes: Node[] = layoutedNodes.map((node) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: {
          label: (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  lineHeight: '1.4',
                }}
              >
                {node.label}
              </span>
              {node.metadata?.description && (
                <span
                  style={{
                    fontSize: '11px',
                    opacity: 0.9,
                    lineHeight: '1.3',
                  }}
                >
                  {node.metadata.description}
                </span>
              )}
            </div>
          ),
          status: node.status,
        },
        style: {
          background: nodeColorMap[node.type] || nodeColorMap.default,
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '12px',
          padding: '16px',
          minWidth: '200px',
          minHeight: '60px',
          boxShadow:
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }));

      // 3. 将业务边映射为 React Flow 边
      const initialEdges: Edge[] = layoutedEdges.map((edge) => ({
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

      const nodeIdCounts = new Map<string, number>();
      const nodeIdMap = new Map<string, string>();
      const uniqueNodes = initialNodes.map((node, index) => {
        const baseId = String(node.id ?? `node-${index}`);
        const count = (nodeIdCounts.get(baseId) ?? 0) + 1;
        nodeIdCounts.set(baseId, count);
        const uniqueId = count === 1 ? baseId : `${baseId}--${count}`;
        if (!nodeIdMap.has(baseId)) {
          nodeIdMap.set(baseId, uniqueId);
        }
        return {
          ...node,
          id: uniqueId,
          data: { ...(node.data as Record<string, unknown>), originalId: baseId },
        };
      });

      const edgeIdCounts = new Map<string, number>();
      const uniqueEdges = initialEdges.map((edge, index) => {
        const source = nodeIdMap.get(String(edge.source)) ?? String(edge.source);
        const target = nodeIdMap.get(String(edge.target)) ?? String(edge.target);
        const baseEdgeId = `${edge.source}-${edge.target}`;
        const edgeCount = (edgeIdCounts.get(baseEdgeId) ?? 0) + 1;
        edgeIdCounts.set(baseEdgeId, edgeCount);
        const uniqueEdgeId =
          edgeCount === 1 ? baseEdgeId : `${baseEdgeId}--${edgeCount}-${index}`;
        return {
          ...edge,
          id: uniqueEdgeId,
          source,
          target,
        };
      });

      return { initialNodes: uniqueNodes, initialEdges: uniqueEdges };
    } catch (error) {
      return { initialNodes: [], initialEdges: [] };
    }
  }, [tf]);

  // 2. 同步数据到状态
  useEffect(() => {
    // 🔒 防御性检查：确保 initialNodes 是数组且不为空
    if (Array.isArray(initialNodes) && initialNodes.length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      
      if (rfInstance) {
        // 稍微延迟一下确保 DOM 就绪
        setTimeout(() => {
          rfInstance.fitView({ padding: 0.2 });
        }, 50);
      }
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, rfInstance]);

  // 3. 导出为 PNG
  const handleExportImage = useCallback(async () => {
    if (!rfInstance || !reactFlowWrapper.current) {
      alert('图表尚未加载完成');
      return;
    }

    try {
      const nodesForBounds = rfInstance.getNodes();
      if (!nodesForBounds.length) {
        alert('没有可导出的节点');
        return;
      }

      const nodesBounds = getNodesBounds(nodesForBounds);
      const padding = 0.2;
      const imageWidth = Math.max(nodesBounds.width * (1 + padding * 2), 800);
      const imageHeight = Math.max(nodesBounds.height * (1 + padding * 2), 600);
      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.1,
        2,
        padding,
      );

      const viewportEl = reactFlowWrapper.current.querySelector(
        '.react-flow__viewport',
      ) as HTMLElement | null;
      if (!viewportEl) {
        throw new Error('找不到流程图视图节点');
      }

      const dataUrl = await toPng(viewportEl, {
        backgroundColor: '#ffffff',
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        filter: (node: HTMLElement) => {
          if (node.classList?.contains('react-flow__controls')) return false;
          if (node.classList?.contains('react-flow__minimap')) return false;
          if (node.classList?.contains('export-toolbar')) return false;
          return true;
        },
      });

      if (!dataUrl) {
        throw new Error('生成的图片数据为空');
      }

      const link = document.createElement('a');
      link.download = `task-flow-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('导出图片失败，请重试');
    }
  }, [rfInstance]);

  // 4. 导出为 Mermaid
  const handleExportMermaid = useCallback(() => {
    if (!tf) return;
    
    // 这里假设你有一个 flowchartToMermaid 工具函数
    // 如果没有，你可以暂时注释掉这部分或实现一个简单的转换器
    try {
      // 动态导入以避免 SSR 问题，或者直接引入你的工具函数
      import('@/lib/flowchart/mermaid').then(({ flowchartToMermaid }) => {
        const code = flowchartToMermaid(tf);
        navigator.clipboard.writeText(code).then(() => {
          alert('✅ Mermaid 代码已复制！\n可粘贴至 Notion / GitHub / Obsidian');
        });
      }).catch(() => {
        // 如果找不到文件，给个提示
        alert('Mermaid 转换工具未找到，请检查路径。');
      });
    } catch (e) {
      console.error(e);
    }
  }, [tf]);

  // 🔒 渲染前的最终检查
  if (!tf || !tf.nodes || tf.nodes.length === 0) {
    return (
      <div style={{
        height: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '12px',
        border: '1px solid var(--stroke)',
        gap: '12px'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--accent)', filter: 'drop-shadow(0 0 15px var(--accent-glow))' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>暂无流程图</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>输入任务描述生成任务流程</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={reactFlowWrapper}
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid var(--stroke)',
        borderRadius: 'var(--border-radius)',
        overflow: 'hidden',
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div className="export-toolbar" style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        background: 'rgba(20, 15, 10, 0.95)',
        padding: '8px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--stroke)',
        backdropFilter: 'blur(10px)'
      }}>
        <button onClick={handleExportImage} style={{
          padding: '8px 14px',
          fontSize: '11px',
          background: 'linear-gradient(135deg, var(--accent), #e67332)',
          color: 'white',
          border: '1px solid var(--accent)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 2px 10px var(--accent-glow)',
          transition: 'all 200ms ease'
        }}>
          下载 PNG
        </button>
        <button onClick={handleExportMermaid} style={{
          padding: '8px 14px',
          fontSize: '11px',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--stroke)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'all 200ms ease'
        }}>
          复制 Mermaid
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={setRfInstance}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        defaultEdgeOptions={{ type: 'smoothstep' }}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="rgba(255, 140, 66, 0.1)" />
        <Controls showInteractive={false} />
        <MiniMap 
          nodeStrokeColor={(n) => nodeColorMap[n.data?.status as string] || '#555'} 
          maskColor="rgba(240, 240, 240, 0.6)"
          zoomable pannable 
        />
      </ReactFlow>
    </div>
  );
}
