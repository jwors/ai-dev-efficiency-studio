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
import { getLayoutedArchitecture, type LayoutedComponent } from '@/lib/architecture/layout';
import {
  COMPONENT_COLORS,
  CONNECTION_STYLES,
  LAYER_ICONS,
  ANIMATED_CONNECTION_TYPES,
} from '@/lib/architecture/constants';
import { useToast } from './Toast';
import styles from './ArchitectureFlow.module.css';

interface ArchitectureFlowProps {
  /** 架构数据对象 */
  architecture: ArchitectureJson | null;
}

interface TransformedData {
  initialNodes: Node[];
  initialEdges: Edge[];
}

/**
 * 将架构数据转换为 React Flow 节点
 */
function transformComponentToNode(
  comp: LayoutedComponent,
): Node {
  const color = COMPONENT_COLORS[comp.type] || COMPONENT_COLORS.default;

  return {
    id: comp.id,
    type: 'default',
    position: comp.position,
    data: {
      label: (
        <div className={styles.nodeLabel}>
          <div className={styles.nodeLabelHeader}>
            <span className={styles.nodeLabelIcon}>
              {LAYER_ICONS[comp.layer] || '📦'}
            </span>
            <span className={styles.nodeLabelName}>{comp.name}</span>
          </div>
          {comp.technology && (
            <span className={styles.nodeLabelTechnology}>{comp.technology}</span>
          )}
          {comp.description && (
            <span className={styles.nodeLabelDescription}>{comp.description}</span>
          )}
        </div>
      ),
      type: comp.type,
      layer: comp.layer,
    },
    style: {
      background: color,
      color: '#fff',
      border: '2px solid rgba(255,255,255,0.3)',
      borderRadius: '16px',
      padding: '16px',
      minWidth: '200px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    },
  };
}

/**
 * 将连接数据转换为 React Flow 边
 */
function transformConnectionToEdge(
  conn: ArchitectureJson['connections'][number],
): Edge {
  const connStyle = CONNECTION_STYLES[conn.type] || { stroke: '#94a3b8' };

  return {
    id: conn.id,
    source: conn.from,
    target: conn.to,
    label: conn.label || conn.type,
    type: 'smoothstep',
    animated: ANIMATED_CONNECTION_TYPES.includes(conn.type),
    style: {
      stroke: connStyle.stroke,
      strokeWidth: 2,
      strokeDasharray: connStyle.strokeDasharray,
    },
    labelStyle: { fill: '#64748b', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
    labelBgPadding: [4, 4] as [number, number],
    labelBgBorderRadius: 4,
  };
}

/**
 * 转换架构数据为 React Flow 格式
 */
function transformArchitectureToFlow(
  architecture: ArchitectureJson | null,
): TransformedData {
  if (
    !architecture ||
    !Array.isArray(architecture.components) ||
    architecture.components.length === 0
  ) {
    return { initialNodes: [], initialEdges: [] };
  }

  try {
    const safeConnections = Array.isArray(architecture.connections)
      ? architecture.connections
      : [];

    const { components: layoutedComponents, connections } = getLayoutedArchitecture(
      architecture.components,
      safeConnections,
      'TB',
    );

    const initialNodes: Node[] = layoutedComponents.map(transformComponentToNode);
    const initialEdges: Edge[] = connections.map(transformConnectionToEdge);

    return { initialNodes, initialEdges };
  } catch (error) {
    console.error('[ArchitectureFlow] Layout error:', error);
    return { initialNodes: [], initialEdges: [] };
  }
}

/**
 * 架构图可视化组件
 *
 * 基于 React Flow 实现系统架构图的可视化展示，支持：
 * - 自动布局
 * - 导出 PNG 图片
 * - 复制 JSON 数据
 *
 * @param props - 组件属性
 * @param props.architecture - 架构数据对象
 */
export function ArchitectureFlow({ architecture }: ArchitectureFlowProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const toast = useToast();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 数据转换与布局计算
  const { initialNodes, initialEdges } = useMemo<TransformedData>(
    () => transformArchitectureToFlow(architecture),
    [architecture],
  );

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
      toast.warning('图表尚未加载完成');
      return;
    }

    try {
      const nodesForBounds = rfInstance.getNodes();
      if (!nodesForBounds.length) {
        toast.warning('没有可导出的节点');
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
      link.download = `architecture-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('架构图已导出');
    } catch (err) {
      console.error('[ArchitectureFlow] Export image error:', err);
      toast.error('导出图片失败，请重试');
    }
  }, [rfInstance, toast]);

  // 导出架构 JSON
  const handleExportJson = useCallback(() => {
    if (!architecture) return;

    const json = JSON.stringify(architecture, null, 2);
    navigator.clipboard
      .writeText(json)
      .then(() => {
        toast.success('架构 JSON 已复制到剪贴板');
      })
      .catch(() => {
        toast.error('复制失败，请检查浏览器权限');
      });
  }, [architecture, toast]);

  // 空状态
  if (!architecture || !architecture.components || architecture.components.length === 0) {
    return (
      <div className={styles.emptyState}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={styles.emptyIcon}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <p className={styles.emptyTitle}>暂无架构图</p>
          <p className={styles.emptySubtitle}>输入需求描述生成系统架构</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className={styles.container}>
      {/* 工具栏 */}
      <div className={`export-toolbar ${styles.toolbar}`}>
        <button
          onClick={handleExportImage}
          className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
        >
          下载 PNG
        </button>
        <button
          onClick={handleExportJson}
          className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
        >
          复制 JSON
        </button>
      </div>

      {/* 架构标题 */}
      <div className={styles.titlePanel}>
        <div className={styles.titleText}>{architecture.title}</div>
        {architecture.style && (
          <div className={styles.styleText}>架构风格: {architecture.style}</div>
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="rgba(255, 140, 66, 0.1)"
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor={(n) =>
            COMPONENT_COLORS[n.data?.type as string] || '#555'
          }
          maskColor="rgba(240, 240, 240, 0.6)"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}