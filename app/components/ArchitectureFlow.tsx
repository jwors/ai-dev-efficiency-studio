'use client';

import React, { useMemo, useEffect, useState, useRef, memo, useCallback } from 'react';
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
  applyNodeChanges,
  NodeChange,
  Handle,
  Position,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ArchitectureJson, ArchitectureComponentType, ArchitectureLayer } from '@/core/types';
import { getLayoutedArchitecture, type LayoutedComponent } from '@/lib/architecture/layout';
import { flowToArchitecture } from '@/lib/architecture/adapters';
import {
  COMPONENT_COLORS,
  CONNECTION_STYLES,
  LAYER_ICONS,
  ANIMATED_CONNECTION_TYPES,
  CONNECTION_TYPE_OPTIONS,
} from '@/lib/architecture/constants';
import {
  COMPONENT_TYPE_OPTIONS,
  ARCHITECTURE_LAYER_OPTIONS,
  generateComponentId,
  getDefaultPosition,
  validateComponentName,
} from '@/lib/architecture/utils';
import { architectureToMermaid, copyMermaidToClipboard, downloadMermaidFile } from '@/lib/architecture/mermaid';
import { useToast } from './Toast';
import styles from './ArchitectureFlow.module.css';

// 性能优化：虚拟化渲染阈值
const VIRTUALIZATION_THRESHOLD = 50;

interface ArchitectureFlowProps {
  /** 架构数据对象 */
  architecture: ArchitectureJson | null;
  /** 是否启用编辑模式（外部控制） */
  editable?: boolean;
  /** 架构数据变更回调 */
  onChange?: (architecture: ArchitectureJson) => void;
}

interface TransformedData {
  initialNodes: Node[];
  initialEdges: ArchitectureFlowEdge[];
}

/** 节点数据类型 */
interface ArchitectureNodeData {
  name?: string;
  type?: ArchitectureComponentType;
  layer?: ArchitectureLayer;
  description?: string;
  technology?: string;
  label?: React.ReactNode;
}

interface ArchitectureFlowEdge extends Edge {
  pathOptions?: {
    offset?: number;
    borderRadius?: number;
  };
}

/**
 * 自定义架构节点组件
 * 动态渲染节点内容，支持编辑时实时更新
 * 性能优化：使用 React.memo 避免不必要的重渲染
 */
const ArchitectureNodeComponent = memo(function ArchitectureNodeComponent({ data }: { data: ArchitectureNodeData }) {
  return (
    <>
      <Handle type="target" position={Position.Top} className={styles.nodeHandle} />
      <div className={styles.nodeLabel}>
        <div className={styles.nodeLabelHeader}>
          <span className={styles.nodeLabelIcon}>
            {LAYER_ICONS[data.layer || 'domain'] || '📦'}
          </span>
          <span className={styles.nodeLabelName}>{data.name || '未命名'}</span>
        </div>
        {data.technology && (
          <span className={styles.nodeLabelTechnology}>{data.technology}</span>
        )}
        {data.description && (
          <span className={styles.nodeLabelDescription}>{data.description}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.nodeHandle} />
    </>
  );
}, function arePropsEqual(prev: { data: ArchitectureNodeData }, next: { data: ArchitectureNodeData }) {
  // 性能优化：自定义比较函数，只在关键字段变化时重新渲染
  return (
    prev.data.name === next.data.name &&
    prev.data.type === next.data.type &&
    prev.data.technology === next.data.technology &&
    prev.data.description === next.data.description &&
    prev.data.layer === next.data.layer
  );
});

/** 自定义节点类型映射 */
const nodeTypes = {
  architectureNode: ArchitectureNodeComponent,
};

/**
 * 将架构数据转换为 React Flow 节点
 */
function transformComponentToNode(
  comp: LayoutedComponent,
): Node {
  const color = COMPONENT_COLORS[comp.type] || COMPONENT_COLORS.default;

  return {
    id: comp.id,
    type: 'architectureNode',
    position: comp.position,
    zIndex: 10,
    data: {
      name: comp.name,
      type: comp.type,
      layer: comp.layer,
      description: comp.description,
      technology: comp.technology,
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
): ArchitectureFlowEdge {
  const connStyle = CONNECTION_STYLES[conn.type] || { stroke: '#94a3b8' };

  return {
    id: conn.id,
    source: conn.from,
    target: conn.to,
    label: conn.label || conn.type,
    type: 'smoothstep',
    zIndex: 1,
    animated: ANIMATED_CONNECTION_TYPES.includes(conn.type),
    pathOptions: {
      offset: 36,
      borderRadius: 18,
    },
    style: {
      stroke: connStyle.stroke,
      strokeWidth: 2,
      strokeDasharray: connStyle.strokeDasharray,
    },
    labelStyle: { fill: '#64748b', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
    labelBgPadding: [4, 4] as [number, number],
    labelBgBorderRadius: 4,
    data: { connectionType: conn.type },
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
    const initialEdges: ArchitectureFlowEdge[] = connections.map(transformConnectionToEdge);

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
 * - 复制 JSON 数据
 * - 编辑模式（可选）
 *
 * @param props - 组件属性
 * @param props.architecture - 架构数据对象
 * @param props.editable - 是否启用编辑功能
 * @param props.onChange - 架构数据变更回调
 */
export function ArchitectureFlow({ architecture, editable = false, onChange }: ArchitectureFlowProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const toast = useToast();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ArchitectureFlowEdge>([]);

  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false);
  const [originalArchitecture, setOriginalArchitecture] = useState<ArchitectureJson | null>(null);

  // 内联编辑状态（双击编辑节点名称）
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  // 新增节点弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeForm, setNewNodeForm] = useState({
    name: '',
    type: 'backend' as ArchitectureComponentType,
    layer: 'application' as ArchitectureLayer,
    description: '',
    technology: '',
  });

  // 选中的边（用于删除和修改类型）
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 边右键菜单状态
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    edgeId: string;
    x: number;
    y: number;
  } | null>(null);

  // 连线类型选择弹窗状态
  const [showConnectionTypeModal, setShowConnectionTypeModal] = useState(false);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

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
          rfInstance.fitView({ padding: 0.35, minZoom: 0.45 });
        }, 50);
      }
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, rfInstance]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextIsFullscreen = document.fullscreenElement === reactFlowWrapper.current;
      setIsFullscreen(nextIsFullscreen);

      if (!rfInstance) return;

      setTimeout(() => {
        rfInstance.fitView({
          padding: nextIsFullscreen ? 0.08 : 0.35,
          minZoom: 0.45,
          duration: 200,
        });
      }, 80);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [rfInstance]);

  // ========== 编辑模式 ==========

  function handleEnterEditMode() {
    if (!architecture) return;
    setOriginalArchitecture(architecture);
    setIsEditing(true);
    toast.info('已进入编辑模式');
  }

  function handleSaveEdit() {
    if (!originalArchitecture || !onChange) return;

    const updatedArchitecture = flowToArchitecture(nodes, edges, originalArchitecture);
    onChange(updatedArchitecture);
    setIsEditing(false);
    setOriginalArchitecture(null);
    toast.success('架构已更新');
  }

  function handleCancelEdit() {
    if (!originalArchitecture) return;

    // 恢复原始数据
    const { initialNodes: restoredNodes, initialEdges: restoredEdges } = transformArchitectureToFlow(originalArchitecture);
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setIsEditing(false);
    setOriginalArchitecture(null);
    toast.info('已取消编辑');
  }

  // ========== 内联编辑（双击编辑节点名称）==========

  function handleNodeDoubleClick(_event: React.MouseEvent, node: Node) {
    if (!isEditing) return;

    const nodeData = node.data as { name?: string };
    setEditingNodeId(node.id);
    setEditingValue(nodeData.name || node.id);
  }

  function handleEditSubmit() {
    if (!editingNodeId) return;

    const validation = validateComponentName(editingValue);
    if (!validation.valid) {
      toast.error(validation.error || '名称无效');
      return;
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== editingNodeId) return node;
        return {
          ...node,
          data: {
            ...node.data,
            name: editingValue.trim(),
          },
        };
      })
    );

    setEditingNodeId(null);
    setEditingValue('');
    toast.success('节点名称已更新');
  }

  // ========== 右键菜单（删除节点）==========

  function handleNodeContextMenu(event: React.MouseEvent, node: Node) {
    if (!isEditing) return;

    event.preventDefault();
    setContextMenu({
      nodeId: node.id,
      x: event.clientX - 300,
      y: event.clientY,
    });
  }

  function handleDeleteNode() {
    if (!contextMenu) return;

    const nodeId = contextMenu.nodeId;

    // 删除节点
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));

    // 删除相关连线
    setEdges((eds) =>
      eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );

    setContextMenu(null);
    toast.success('节点已删除');
  }

  // ========== 新增节点 ==========

  function handleOpenAddModal() {
    setNewNodeForm({
      name: '',
      type: 'backend',
      layer: 'application',
      description: '',
      technology: '',
    });
    setShowAddModal(true);
  }

  function handleAddNode() {
    const validation = validateComponentName(newNodeForm.name);
    if (!validation.valid) {
      toast.error(validation.error || '名称无效');
      return;
    }

    const existingIds = new Set(nodes.map((n) => n.id));
    const newId = generateComponentId(newNodeForm.name, existingIds);
    const position = getDefaultPosition(nodes);

    const newNode: Node = {
      id: newId,
      type: 'architectureNode',
      position,
      data: {
        name: newNodeForm.name.trim(),
        type: newNodeForm.type,
        layer: newNodeForm.layer,
        description: newNodeForm.description || undefined,
        technology: newNodeForm.technology || undefined,
      },
      style: {
        background: COMPONENT_COLORS[newNodeForm.type] || COMPONENT_COLORS.default,
        color: '#fff',
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '200px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowAddModal(false);
    toast.success('节点已添加');
  }

  // ========== 连线编辑 ==========

  function handleConnect(connection: Connection) {
    if (!isEditing) return;

    // 验证：源节点和目标节点必须存在
    if (!connection.source || !connection.target) {
      toast.error('无效的连线：缺少源节点或目标节点');
      return;
    }

    // 验证：禁止自环连线（source === target）
    if (connection.source === connection.target) {
      toast.warning('不能创建自环连线');
      return;
    }

    // 验证：源节点和目标节点必须存在于当前节点列表中
    const sourceExists = nodes.some((n) => n.id === connection.source);
    const targetExists = nodes.some((n) => n.id === connection.target);
    if (!sourceExists || !targetExists) {
      toast.error('无效的连线：节点不存在');
      return;
    }

    // 检查是否已存在相同连线（相同源和目标）
    const exists = edges.some(
      (e) => e.source === connection.source && e.target === connection.target
    );
    if (exists) {
      toast.warning('该连线已存在');
      return;
    }

    // 生成唯一的连线 ID：使用时间戳确保唯一性
    const newEdgeId = `conn-${connection.source}-${connection.target}-${Date.now()}`;

    // 创建新边，默认类型为 http
    const connStyle = CONNECTION_STYLES.http;
    const newEdge: ArchitectureFlowEdge = {
      id: newEdgeId,
      source: connection.source!,
      target: connection.target!,
      label: 'http',
      type: 'smoothstep',
      zIndex: 1,
      animated: true,
      pathOptions: {
        offset: 36,
        borderRadius: 18,
      },
      style: {
        stroke: connStyle.stroke,
        strokeWidth: 2,
      },
      labelStyle: { fill: '#64748b', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
      labelBgPadding: [4, 4] as [number, number],
      labelBgBorderRadius: 4,
      data: { connectionType: 'http' },
    };

    setEdges((eds) => addEdge(newEdge, eds));
    toast.success('连线已创建');
  }

  function handleEdgeClick(_event: React.MouseEvent, edge: Edge) {
    if (!isEditing) return;
    setSelectedEdgeId(edge.id);
  }

  function handleEdgeContextMenu(event: React.MouseEvent, edge: Edge) {
    if (!isEditing) return;
    event.preventDefault();
    setEdgeContextMenu({
      edgeId: edge.id,
      x: event.clientX,
      y: event.clientY,
    });
    setSelectedEdgeId(edge.id);
  }

  function handleDeleteEdge() {
    if (!selectedEdgeId && !edgeContextMenu) return;

    const edgeIdToDelete = edgeContextMenu?.edgeId || selectedEdgeId;
    if (!edgeIdToDelete) return;

    setEdges((eds) => eds.filter((e) => e.id !== edgeIdToDelete));
    setSelectedEdgeId(null);
    setEdgeContextMenu(null);
    toast.success('连线已删除');
  }

  function handleOpenConnectionTypeModal() {
    if (!edgeContextMenu) return;
    setEditingEdgeId(edgeContextMenu.edgeId);
    setShowConnectionTypeModal(true);
    setEdgeContextMenu(null);
  }

  function handleChangeConnectionType(newType: string) {
    if (!editingEdgeId) return;

    const style = CONNECTION_STYLES[newType] || { stroke: '#94a3b8' };
    const isAnimated = ANIMATED_CONNECTION_TYPES.includes(newType);

    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id !== editingEdgeId) return edge;
        return {
          ...edge,
          label: newType,
          animated: isAnimated,
          style: {
            stroke: style.stroke,
            strokeWidth: 2,
            strokeDasharray: style.strokeDasharray,
          },
          data: { ...edge.data, connectionType: newType },
        };
      })
    );

    setShowConnectionTypeModal(false);
    setEditingEdgeId(null);
    setSelectedEdgeId(null);
    toast.success('连线类型已更新');
  }

  // 键盘删除选中的边
  useEffect(() => {
    if (!isEditing || !selectedEdgeId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 防止在输入框中触发
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
        setSelectedEdgeId(null);
        toast.success('连线已删除');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, selectedEdgeId, setEdges, toast]);

  // 更新选中边的样式
  useEffect(() => {
    if (!isEditing) return;

    setEdges((eds) =>
      eds.map((edge) => {
        const isSelected = edge.id === selectedEdgeId;
        const connType = (edge.data?.connectionType as string) || 'http';
        const baseStyle = CONNECTION_STYLES[connType] || { stroke: '#94a3b8' };

        return {
          ...edge,
          style: {
            stroke: isSelected ? '#ff8c42' : baseStyle.stroke,
            strokeWidth: isSelected ? 3 : 2,
            strokeDasharray: baseStyle.strokeDasharray,
          },
        };
      })
    );
  }, [selectedEdgeId, isEditing, setEdges]);

  // ========== 导出功能 ==========

  async function handleExportImage() {
    const container = reactFlowWrapper.current;
    const controls = container?.querySelector('.react-flow__controls') as HTMLElement | null;
    const minimap = container?.querySelector('.react-flow__minimap') as HTMLElement | null;
    const toolbar = container?.querySelector('.export-toolbar') as HTMLElement | null;
    const titlePanel = container?.querySelector(`.${styles.titlePanel}`) as HTMLElement | null;
    const viewportEl = container?.querySelector('.react-flow__viewport') as HTMLElement | null;
    const originalDisplay = {
      controls: controls?.style.display,
      minimap: minimap?.style.display,
      toolbar: toolbar?.style.display,
      titlePanel: titlePanel?.style.display,
    };
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


      // 隐藏不需要的元素
      if (!viewportEl) {
        throw new Error('Viewport element not found');
      }

      if (controls) controls.style.display = 'none';
      if (minimap) minimap.style.display = 'none';
      if (toolbar) toolbar.style.display = 'none';
      if (titlePanel) titlePanel.style.display = 'none';

      // 使用更大的 padding 确保所有节点完整显示
      const nodesBounds = getNodesBounds(nodesForBounds);
      if (!viewportEl) {
        throw new Error('Viewport element not found');
      }

      const exportPadding = 120;
      const imageWidth = Math.max(Math.ceil(nodesBounds.width + exportPadding * 2), 1600);
      const imageHeight = Math.max(Math.ceil(nodesBounds.height + exportPadding * 2), 900);
      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.1,
        2,
        0.12,
      );

      // 等待视图更新
      

      // 截图（不指定宽高，使用容器实际大小）
      const dataUrl = await toPng(viewportEl, {
        backgroundColor: '#ffffff',
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        width: imageWidth,
        height: imageHeight,
        canvasWidth: imageWidth * 2,
        canvasHeight: imageHeight * 2,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: 'top left',
        },
        filter: (node: HTMLElement) => {
          // 过滤掉不需要的元素
          const className = node.className;
          if (typeof className === 'string') {
            if (className.includes('react-flow__controls')) return false;
            if (className.includes('react-flow__minimap')) return false;
            if (className.includes('export-toolbar')) return false;
          }
          return true;
        },
      });

      // 恢复隐藏的元素
      
      
      
      

      if (!dataUrl) {
        throw new Error('生成的图片数据为空');
      }

      // 生成文件名: [projectName]-[architectureName]-[datetimes].png
      const architectureName = architecture?.title?.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-') || 'architecture';
      const datetime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `${architectureName}-${datetime}.png`;

      // 下载图片
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      toast.success('架构图已导出');
    } catch (err) {
      console.error('[ArchitectureFlow] Export image error:', err);
      toast.error('导出图片失败，请重试');
    } finally {
      if (controls) controls.style.display = originalDisplay.controls || '';
      if (minimap) minimap.style.display = originalDisplay.minimap || '';
      if (toolbar) toolbar.style.display = originalDisplay.toolbar || '';
      if (titlePanel) titlePanel.style.display = originalDisplay.titlePanel || '';
    }
  }

  function handleExportJson() {
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
  }

  // ========== Mermaid 导出功能 ==========

  async function handleExportMermaid() {
    if (!architecture) return;

    const success = await copyMermaidToClipboard(architecture);
    if (success) {
      toast.success('Mermaid 代码已复制到剪贴板');
    } else {
      toast.error('复制失败，请检查浏览器权限');
    }
  }

  function handleDownloadMermaid() {
    if (!architecture) return;

    downloadMermaidFile(architecture);
    toast.success('Mermaid 文件已下载');
  }

  // ========== 性能监控 ==========

  async function handleToggleFullscreen() {
    const container = reactFlowWrapper.current;
    if (!container) return;

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
        return;
      }

      await container.requestFullscreen();
    } catch (error) {
      console.error('[ArchitectureFlow] Fullscreen error:', error);
      toast.error('全屏切换失败，请检查浏览器权限');
    }
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && nodes.length > 0) {
      const startTime = performance.now();
      return () => {
        const renderTime = performance.now() - startTime;
        if (renderTime > 100) {
          console.warn(`[ArchitectureFlow] Slow render: ${renderTime.toFixed(2)}ms for ${nodes.length} nodes`);
        }
      };
    }
  }, [nodes.length]);

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
    <div
      ref={reactFlowWrapper}
      className={styles.container}
      onClick={() => {
        setContextMenu(null);
        setEdgeContextMenu(null);
      }}
    >
      {/* 工具栏 */}
      <div className={`export-toolbar ${styles.toolbar}`}>
        {isEditing ? (
          // 编辑模式工具栏
          <>
            <button
              onClick={handleOpenAddModal}
              className={`${styles.toolbarButton} ${styles.toolbarButtonAdd}`}
              title="添加节点"
            >
              + 添加
            </button>
            <button
              onClick={handleSaveEdit}
              className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
            >
              保存
            </button>
            <button
              onClick={handleCancelEdit}
              className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
            >
              取消
            </button>
          </>
        ) : (
          // 查看模式工具栏
          <>
            {editable && (
              <button
                onClick={handleEnterEditMode}
                className={`${styles.toolbarButton} ${styles.toolbarButtonEdit}`}
              >
                编辑
              </button>
            )}
            <button
              onClick={handleToggleFullscreen}
              className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </button>
            <button
              onClick={handleExportJson}
              className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
            >
              复制 JSON
            </button>
            <button
              onClick={handleExportMermaid}
              className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
              title="复制 Mermaid 代码到剪贴板"
            >
              Mermaid
            </button>
            <button
              onClick={handleDownloadMermaid}
              className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
              title="下载 .mmd 文件"
            >
              .mmd
            </button>
          </>
        )}
      </div>

      {/* 架构标题 */}
      <div className={styles.titlePanel}>
        <div className={styles.titleText}>
          {architecture.title}
          {isEditing && <span className={styles.editingBadge}>编辑中</span>}
        </div>
        {architecture.style && (
          <div className={styles.styleText}>架构风格: {architecture.style}</div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={handleDeleteNode}
          >
            删除节点
          </button>
        </div>
      )}

      {/* 边右键菜单 */}
      {edgeContextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            left: edgeContextMenu.x,
            top: edgeContextMenu.y,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={handleOpenConnectionTypeModal}
          >
            修改连线类型
          </button>
          <button
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={handleDeleteEdge}
          >
            删除连线
          </button>
        </div>
      )}

      {/* 连线类型选择弹窗 */}
      {showConnectionTypeModal && (
        <div className={styles.modalOverlay} onClick={() => setShowConnectionTypeModal(false)}>
          <div
            className={`${styles.modal} ${styles.connectionTypeModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>选择连线类型</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowConnectionTypeModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.connectionTypeList}>
              {CONNECTION_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={styles.connectionTypeItem}
                  onClick={() => handleChangeConnectionType(option.value)}
                  style={{ borderLeftColor: option.color }}
                >
                  <span className={styles.connectionTypeLabel}>{option.label}</span>
                  <span className={styles.connectionTypeValue}>{option.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 新增节点弹窗 */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>添加组件</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>名称 *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newNodeForm.name}
                  onChange={(e) => setNewNodeForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="输入组件名称"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>类型</label>
                <select
                  className={styles.formSelect}
                  value={newNodeForm.type}
                  onChange={(e) => setNewNodeForm((prev) => ({ ...prev, type: e.target.value as ArchitectureComponentType }))}
                >
                  {COMPONENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>架构层</label>
                <select
                  className={styles.formSelect}
                  value={newNodeForm.layer}
                  onChange={(e) => setNewNodeForm((prev) => ({ ...prev, layer: e.target.value as ArchitectureLayer }))}
                >
                  {ARCHITECTURE_LAYER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>技术栈</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={newNodeForm.technology}
                  onChange={(e) => setNewNodeForm((prev) => ({ ...prev, technology: e.target.value }))}
                  placeholder="如 React, PostgreSQL"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>描述</label>
                <textarea
                  className={styles.formTextarea}
                  value={newNodeForm.description}
                  onChange={(e) => setNewNodeForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="组件功能描述"
                  rows={2}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
                onClick={() => setShowAddModal(false)}
              >
                取消
              </button>
              <button
                className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
                onClick={handleAddNode}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 内联编辑输入框 */}
      {editingNodeId && (
        <div
          className={styles.inlineEditOverlay}
          onClick={() => {
            setEditingNodeId(null);
            setEditingValue('');
          }}
        >
          <div
            className={styles.inlineEditContainer}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={editInputRef}
              type="text"
              className={styles.inlineEditInput}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSubmit();
                if (e.key === 'Escape') {
                  setEditingNodeId(null);
                  setEditingValue('');
                }
              }}
              onBlur={handleEditSubmit}
              autoFocus
            />
            <div className={styles.inlineEditHint}>
              按 Enter 确认，Esc 取消
            </div>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={isEditing ? onNodesChange : undefined}
        onEdgesChange={isEditing ? onEdgesChange : undefined}
        onConnect={isEditing ? handleConnect : undefined}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeClick={handleEdgeClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        onInit={setRfInstance}
        fitView
        fitViewOptions={{ padding: 0.35, minZoom: 0.45 }}
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'smoothstep',
          zIndex: 1,
        }}
        nodesDraggable={isEditing}
        nodesConnectable={isEditing}
        elementsSelectable={isEditing}
        // 性能优化：大型图表时启用虚拟化
        onlyRenderVisibleElements={nodes.length > VIRTUALIZATION_THRESHOLD}
        minZoom={0.35}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(0, 0, 0, 0.08)"
        />
        <Controls showInteractive={isEditing} />
      </ReactFlow>
    </div>
  );
}
