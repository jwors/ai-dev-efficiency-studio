 'use client';

import { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import type { WbsGraph } from '@/core/types/type';

type TaskFlowProps = {
  wbs: WbsGraph | null;
};

type PositionedNode = {
  id: string;
  title: string;
  type: string;
  status: string;
  parentId: string | null;
  level: number;
  order: number;
};

function buildLayout(wbs: WbsGraph): PositionedNode[] {
  const nodes = wbs.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentId) {
      const list = children.get(n.parentId) ?? [];
      list.push(n.id);
      children.set(n.parentId, list);
    }
  }

  const roots = nodes.filter((n) => !n.parentId);
  const positioned: PositionedNode[] = [];
  let order = 0;

  const walk = (id: string, level: number) => {
    const node = byId.get(id);
    if (!node) return;
    positioned.push({
      id: node.id,
      title: node.title,
      type: node.type,
      status: node.status,
      parentId: node.parentId,
      level,
      order: order++,
    });
    const kids = children.get(id) ?? [];
    for (const childId of kids) {
      walk(childId, level + 1);
    }
  };

  for (const r of roots) {
    walk(r.id, 0);
  }

  return positioned;
}

export default function TaskFlow({ wbs }: TaskFlowProps) {
  const { nodes, edges } = useMemo(() => {
    if (!wbs) {
      return { nodes: [], edges: [] };
    }

    const positioned = buildLayout(wbs);
    const flowNodes = positioned.map((n) => ({
      id: n.id,
      position: { x: n.level * 260, y: n.order * 90 },
      data: {
        label: (
          <div className="flow-node-label">
            <div className="flow-node-title">{n.title}</div>
            <div className="flow-node-action">
              {n.type} - {n.status}
            </div>
          </div>
        ),
      },
      className: `flow-node status-${n.status}`,
    }));

    const parentEdges = wbs.nodes
      .filter((n) => n.parentId)
      .map((n) => ({
        id: `edge-parent-${n.parentId}-${n.id}`,
        source: String(n.parentId),
        target: n.id,
        type: 'smoothstep',
      }));

    const dependencyEdges = wbs.edges
      .filter((e) => e.type === 'dependency')
      .map((e) => ({
        id: `edge-dep-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        animated: true,
        style: { strokeDasharray: '6 6' },
        type: 'smoothstep',
      }));

    return { nodes: flowNodes, edges: [...parentEdges, ...dependencyEdges] };
  }, [wbs]);

  if (!wbs) {
    return <div className="flow-empty">No WBS yet.</div>;
  }

  return (
    <div className="flow-wrap">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
