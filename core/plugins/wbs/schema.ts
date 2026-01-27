import z from 'zod';

export const WbsNodeType = z.enum(['goal', 'milestone', 'task', 'subtask']);
export const WbsNodeStatus = z.enum(['todo', 'doing', 'done', 'blocked']);
export const WbsEdgeType = z.enum(['parent', 'dependency']);

export const WbsNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: WbsNodeType,
  status: WbsNodeStatus,
  parentId: z.string().nullable(),
  dependsOn: z.array(z.string()),
  notes: z.array(z.string()),
});

export const WbsEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: WbsEdgeType,
});

export const WbsUpdatesSchema = z.object({
  addedNodeIds: z.array(z.string()),
  updatedNodeIds: z.array(z.string()),
  removedNodeIds: z.array(z.string()),
});

export const WbsSchema = z.object({
  version: z.literal('wbs.v1'),
  goal: z.string().min(1),
  nodes: z.array(WbsNodeSchema),
  edges: z.array(WbsEdgeSchema),
  updates: WbsUpdatesSchema,
});

export type WbsGraph = z.infer<typeof WbsSchema>;
