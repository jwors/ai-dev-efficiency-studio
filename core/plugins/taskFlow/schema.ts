// lib/schemas/flowchart.ts
import z from 'zod';

// 节点类型（根据你的 prompt 要求）
export const FlowchartNodeType = z.enum([
  'start',
  'end',
  'task',
  'decision',
  'parallel',
  'subprocess',
  'io',
]);

// 节点状态
export const FlowchartNodeStatus = z.enum(['todo', 'doing', 'done', 'blocked']);

// 边的类型
export const FlowchartEdgeType = z.enum(['sequence', 'condition', 'parallel']);

// 可选的元数据（metadata）
export const FlowchartNodeMetadataSchema = z.object({
  description: z.string().optional(),
  assignee: z.string().optional(),
  estimatedHours: z.number().optional(),
});

// 节点定义
export const FlowchartNodeSchema = z.object({
  id: z.string().min(1, 'Node ID must be non-empty'),
  label: z.string().min(1, 'Node label must be non-empty'),
  type: FlowchartNodeType,
  status: FlowchartNodeStatus,
  metadata: FlowchartNodeMetadataSchema.optional(),
});

// 边定义
export const FlowchartEdgeSchema = z.object({
  from: z.string().min(1, 'Edge "from" must be non-empty'),
  to: z.string().min(1, 'Edge "to" must be non-empty'),
  label: z.string().optional(), // 条件标签，如 "是", "失败"
  type: FlowchartEdgeType,
});

// 更新记录（用于增量更新）
export const FlowchartUpdatesSchema = z.object({
  addedNodeIds: z.array(z.string()).default([]),
  updatedNodeIds: z.array(z.string()).default([]),
  removedNodeIds: z.array(z.string()).default([]),
  addedEdgeIds: z.array(z.string()).default([]), // 建议格式: "from->to"
  removedEdgeIds: z.array(z.string()).default([]),
});

// 完整流程图 Schema
export const FlowchartSchema = z.object({
  version: z.literal('flowchart.v1'),
  title: z.string().min(1, 'Flowchart title is required'),
  nodes: z.array(FlowchartNodeSchema).min(1, 'At least one node is required'),
  edges: z.array(FlowchartEdgeSchema).default([]),
  updates: FlowchartUpdatesSchema.default({
    addedNodeIds: [],
    updatedNodeIds: [],
    removedNodeIds: [],
    addedEdgeIds: [],
    removedEdgeIds: [],
  }),
});

// 导出类型
export type FlowchartNode = z.infer<typeof FlowchartNodeSchema>;
export type FlowchartEdge = z.infer<typeof FlowchartEdgeSchema>;
export type FlowchartUpdates = z.infer<typeof FlowchartUpdatesSchema>;
export type FlowchartGraph = z.infer<typeof FlowchartSchema>;