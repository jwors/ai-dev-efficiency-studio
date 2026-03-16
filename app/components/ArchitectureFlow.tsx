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

import type { ArchitectureJson } from '@/core/types';
import { getLayoutedArchitecture } from '@/lib/architecture/layout';

interface ArchitectureFlowProps {
  architecture: ArchitectureJson | null;
}

// 组件类型对应的颜色
const componentColorMap: Record<string, string> = {
  frontend: '#3b82f6',     // 蓝色 - 前端
  backend: '#10b981',      // 绿色 - 后端
  database: '#f59e0b',     // 黄色 - 数据库
  cache: '#ef4444',        // 红色 - 缓存
  queue: '#8b5cf6',        // 紫色 - 消息队列
  'api-gateway': '#06b6d4', // 青色 - API 网关
  'auth-service': '#ec4899', // 粉色 - 认证服务
  storage: '#6366f1',      // 靛蓝色 - 存储
  cdn: '#14b8a6',          // 青绿色 - CDN
  'external-api': '#64748b', // 灰色 - 外部 API
  default: '#60a5fa',
};

// 连接类型对应的样式
const connectionStyleMap: Record<string, { stroke: string; strokeDasharray?: string }> = {
  http: { stroke: '#3b82f6' },
  websocket: { stroke: '#10b981', strokeDasharray: '5,5' },
  tcp: { stroke: '#f59e0b' },
  grpc: { stroke: '#8b5cf6' },
  database: { stroke: '#ef4444' },
  cache: { stroke: '#ec4899', strokeDasharray: '3,3' },
  queue: { stroke: '#06b6d4', strokeDasharray: '8,4' },
  file: { stroke: '#6366f1' },
};

// 架构层对应的图标
const layerIconMap: Record<string, string> = {
  presentation: '🖥️',
  application: '⚙️',
  domain: '📦',
  infrastructure: '🔧',
  data: '💾',
};

export function ArchitectureFlow({ architecture }: ArchitectureFlowProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 数据转换与布局计算
  const { initialNodes, initialEdges } = useMemo<{
    initialNodes: Node[];
    initialEdges: Edge[];
  }>(() => {
    if (!architecture || !Array.isArray(architecture.components) || architecture.components.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    try {
      const safeConnections = Array.isArray(architecture.connections) ? architecture.connections : [];

      // 布局计算
      const { components: layoutedComponents, connections } = getLayoutedArchitecture(
        architecture.components,
        safeConnections,
        'TB'
      );

      // 映射为 React Flow 节点
      const initialNodes: Node[] = layoutedComponents.map((comp) => ({
        id: comp.id,
        type: 'default',
        position: comp.position,
        data: {
          label: (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              textAlign: 'center',
              minWidth: '180px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '18px' }}>{layerIconMap[comp.layer] || '📦'}</span>
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  lineHeight: '1.4',
                }}>
                  {comp.name}
                </span>
              </div>
              {comp.technology && (
                <span style={{
                  fontSize: '11px',
                  opacity: 0.85,
                  background: 'rgba(255,255,255,0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}>
                  {comp.technology}
                </span>
              )}
              {comp.description && (
                <span style={{
                  fontSize: '10px',
                  opacity: 0.7,
                  lineHeight: '1.3',
                }}>
                  {comp.description}
                </span>
              )}
            </div>
          ),
          type: comp.type,
          layer: comp.layer,
        },
        style: {
          background: componentColorMap[comp.type] || componentColorMap.default,
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.3)',
          borderRadius: '16px',
          padding: '16px',
          minWidth: '200px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        },
      }));

      // 映射为 React Flow 边
      const initialEdges: Edge[] = connections.map((conn) => {
        const style = connectionStyleMap[conn.type] || { stroke: '#94a3b8' };
        return {
          id: conn.id,
          source: conn.from,
          target: conn.to,
          label: conn.label || conn.type,
          type: 'smoothstep',
          animated: ['http', 'websocket', 'queue'].includes(conn.type),
          style: {
            stroke: style.stroke,
            strokeWidth: 2,
            strokeDasharray: style.strokeDasharray,
          },
          labelStyle: { fill: '#64748b', fontWeight: 600, fontSize: 11 },
          labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4,
        };
      });

      return { initialNodes, initialEdges };
    } catch (error) {
      console.error('[ArchitectureFlow] Layout error:', error);
      return { initialNodes: [], initialEdges: [] };
    }
  }, [architecture]);

  // 同步数据到状态
  useEffect(() => {
    if (Array.isArray(initialNodes) && initialNodes.length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);

      if (rfInstance) {
        setTimeout(() => {
          rfInstance.fitView({ padding: 0.2 });
        }, 50);
      }
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, rfInstance]);

  // 导出 PNG
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
      const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.1, 2, padding);

      const viewportEl = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement | null;
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
      link.download = `architecture-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('导出图片失败，请重试');
    }
  }, [rfInstance]);

  // 导出架构 JSON
  const handleExportJson = useCallback(() => {
    if (!architecture) return;
    const json = JSON.stringify(architecture, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('✅ 架构 JSON 已复制到剪贴板');
    }).catch(() => alert('复制失败，请检查浏览器权限'));
  }, [architecture]);

  // 空状态
  if (!architecture || !architecture.components || architecture.components.length === 0) {
    return (
      <div style={{
        height: '100%',
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>暂无架构图</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>输入需求描述生成系统架构</p>
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
      {/* 工具栏 */}
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
        <button onClick={handleExportJson} style={{
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
          复制 JSON
        </button>
      </div>

      {/* 架构标题 */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 1000,
        background: 'rgba(20, 15, 10, 0.9)',
        padding: '10px 16px',
        borderRadius: '8px',
        border: '1px solid var(--stroke)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
          {architecture.title}
        </div>
        {architecture.style && (
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            架构风格: {architecture.style}
          </div>
        )}
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
          nodeStrokeColor={(n) => componentColorMap[n.data?.type as string] || '#555'}
          maskColor="rgba(240, 240, 240, 0.6)"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}