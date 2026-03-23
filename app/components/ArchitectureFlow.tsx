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
  applyNodeChanges,
  NodeChange,
  Handle,
  Position,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';

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
import { useToast } from './Toast';
import styles from './ArchitectureFlow.module.css';

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
  initialEdges: Edge[];
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

/**
 * 自定义架构节点组件
 * 动态渲染节点内容，支持编辑时实时更新
 */
function ArchitectureNodeComponent({ data }: { data: ArchitectureNodeData }) {
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
}

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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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
          rfInstance.fitView({ padding: 0.2 });
        }, 50);
      }
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, rfInstance]);

  // 进入编辑模式
  const handleEnterEditMode = useCallback(() => {
    if (!architecture) return;
    setOriginalArchitecture(architecture);
    setIsEditing(true);
    toast.info('已进入编辑模式');
  }, [architecture, toast]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (!originalArchitecture || !onChange) return;

    const updatedArchitecture = flowToArchitecture(nodes, edges, originalArchitecture);
    onChange(updatedArchitecture);
    setIsEditing(false);
    setOriginalArchitecture(null);
    toast.success('架构已更新');
  }, [nodes, edges, originalArchitecture, onChange, toast]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    if (!originalArchitecture) return;

    // 恢复原始数据
    const { initialNodes: restoredNodes, initialEdges: restoredEdges } = transformArchitectureToFlow(originalArchitecture);
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setIsEditing(false);
    setOriginalArchitecture(null);
    toast.info('已取消编辑');
  }, [originalArchitecture, setNodes, setEdges, toast]);

  // ========== 内联编辑（双击编辑节点名称）==========

  // 双击节点进入编辑
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!isEditing) return;

      const nodeData = node.data as { name?: string };
      setEditingNodeId(node.id);
      setEditingValue(nodeData.name || node.id);
    },
    [isEditing]
  );

  // 编辑输入变更
  const handleEditInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  }, []);

  // 提交编辑
  const handleEditSubmit = useCallback(() => {
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
  }, [editingNodeId, editingValue, setNodes, toast]);

  // 取消编辑
  const handleEditCancel = useCallback(() => {
    setEditingNodeId(null);
    setEditingValue('');
  }, []);

  // ========== 右键菜单（删除节点）==========

  // 右键菜单显示
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!isEditing) return;

      event.preventDefault();
      setContextMenu({
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [isEditing]
  );

  // 关闭右键菜单
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 删除节点
  const handleDeleteNode = useCallback(() => {
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
  }, [contextMenu, setNodes, setEdges, toast]);

  // ========== 新增节点 ==========

  // 打开新增弹窗
  const handleOpenAddModal = useCallback(() => {
    setNewNodeForm({
      name: '',
      type: 'backend',
      layer: 'application',
      description: '',
      technology: '',
    });
    setShowAddModal(true);
  }, []);

  // 关闭新增弹窗
  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  // 表单字段变更
  const handleFormChange = useCallback(
    (field: keyof typeof newNodeForm, value: string) => {
      setNewNodeForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // 提交新增节点
  const handleAddNode = useCallback(() => {
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
  }, [newNodeForm, nodes, setNodes, toast]);

  // ========== 连线编辑 ==========

  // 创建新连线（从 Handle 拖拽）
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isEditing) return;

      // 生成新连线 ID
      const newEdgeId = `conn-${connection.source}-${connection.target}`;

      // 检查是否已存在相同连线
      const exists = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (exists) {
        toast.warning('该连线已存在');
        return;
      }

      // 创建新边，默认类型为 http
      const connStyle = CONNECTION_STYLES.http;
      const newEdge: Edge = {
        id: newEdgeId,
        source: connection.source!,
        target: connection.target!,
        label: 'http',
        type: 'smoothstep',
        animated: true,
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
    },
    [isEditing, edges, setEdges, toast]
  );

  // 边点击选中
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (!isEditing) return;
      setSelectedEdgeId(edge.id);
    },
    [isEditing]
  );

  // 边右键菜单
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!isEditing) return;
      event.preventDefault();
      setEdgeContextMenu({
        edgeId: edge.id,
        x: event.clientX,
        y: event.clientY,
      });
      setSelectedEdgeId(edge.id);
    },
    [isEditing]
  );

  // 关闭边右键菜单
  const handleCloseEdgeContextMenu = useCallback(() => {
    setEdgeContextMenu(null);
  }, []);

  // 删除选中的边
  const handleDeleteEdge = useCallback(() => {
    if (!selectedEdgeId && !edgeContextMenu) return;

    const edgeIdToDelete = edgeContextMenu?.edgeId || selectedEdgeId;
    if (!edgeIdToDelete) return;

    setEdges((eds) => eds.filter((e) => e.id !== edgeIdToDelete));
    setSelectedEdgeId(null);
    setEdgeContextMenu(null);
    toast.success('连线已删除');
  }, [selectedEdgeId, edgeContextMenu, setEdges, toast]);

  // 打开连线类型选择弹窗
  const handleOpenConnectionTypeModal = useCallback(() => {
    if (!edgeContextMenu) return;
    setEditingEdgeId(edgeContextMenu.edgeId);
    setShowConnectionTypeModal(true);
    setEdgeContextMenu(null);
  }, [edgeContextMenu]);

  // 关闭连线类型选择弹窗
  const handleCloseConnectionTypeModal = useCallback(() => {
    setShowConnectionTypeModal(false);
    setEditingEdgeId(null);
  }, []);

  // 修改连线类型
  const handleChangeConnectionType = useCallback(
    (newType: string) => {
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
    },
    [editingEdgeId, setEdges, toast]
  );

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
    <div
      ref={reactFlowWrapper}
      className={styles.container}
      onClick={() => {
        handleCloseContextMenu();
        handleCloseEdgeContextMenu();
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
        <div className={styles.modalOverlay} onClick={handleCloseConnectionTypeModal}>
          <div
            className={`${styles.modal} ${styles.connectionTypeModal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>选择连线类型</h3>
              <button
                className={styles.modalClose}
                onClick={handleCloseConnectionTypeModal}
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
        <div className={styles.modalOverlay} onClick={handleCloseAddModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>添加组件</h3>
              <button
                className={styles.modalClose}
                onClick={handleCloseAddModal}
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
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="输入组件名称"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>类型</label>
                <select
                  className={styles.formSelect}
                  value={newNodeForm.type}
                  onChange={(e) => handleFormChange('type', e.target.value)}
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
                  onChange={(e) => handleFormChange('layer', e.target.value)}
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
                  onChange={(e) => handleFormChange('technology', e.target.value)}
                  placeholder="如 React, PostgreSQL"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>描述</label>
                <textarea
                  className={styles.formTextarea}
                  value={newNodeForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="组件功能描述"
                  rows={2}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.toolbarButton} ${styles.toolbarButtonSecondary}`}
                onClick={handleCloseAddModal}
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
          onClick={handleEditCancel}
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
              onChange={handleEditInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSubmit();
                if (e.key === 'Escape') handleEditCancel();
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
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        defaultEdgeOptions={{ type: 'smoothstep' }}
        nodesConnectable={isEditing}
        elementsSelectable={isEditing}
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