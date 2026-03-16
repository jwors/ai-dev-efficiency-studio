import { describe, expect, it } from 'vitest';
import { architectureToTaskFlowView, architectureToWbsView } from '@/lib/architecture/adapters';
import type { ArchitectureJson } from '@/core/types';

const sampleArchitecture: ArchitectureJson = {
  version: 'arch.v1',
  title: '后台管理系统',
  style: 'monolith',
  layers: [
    { name: 'presentation' },
    { name: 'application' },
    { name: 'data' },
  ],
  components: [
    {
      id: 'frontend-app',
      name: '前端应用',
      type: 'frontend',
      layer: 'presentation',
      technology: 'React',
    },
    {
      id: 'api-server',
      name: 'API 服务',
      type: 'backend',
      layer: 'application',
      technology: 'Node.js',
      description: '处理业务请求',
    },
    {
      id: 'postgres-db',
      name: 'PostgreSQL',
      type: 'database',
      layer: 'data',
      technology: 'PostgreSQL',
    },
  ],
  connections: [
    { id: 'frontend-api', from: 'frontend-app', to: 'api-server', type: 'http', label: 'REST' },
    { id: 'api-db', from: 'api-server', to: 'postgres-db', type: 'database' },
  ],
  techStack: [],
  updates: {
    addedComponentIds: ['frontend-app'],
    updatedComponentIds: ['api-server'],
    removedComponentIds: [],
    addedConnectionIds: ['frontend-api'],
    removedConnectionIds: [],
  },
};

describe('architecture adapters', () => {
  it('maps architecture to WBS view data', () => {
    const wbs = architectureToWbsView(sampleArchitecture);

    expect(wbs.version).toBe('wbs.v1');
    expect(wbs.goal).toBe(sampleArchitecture.title);
    expect(wbs.nodes).toHaveLength(3);
    expect(wbs.nodes[0]?.type).toBe('goal');
    expect(wbs.nodes.find((node) => node.id === 'api-server')?.dependsOn).toEqual(['frontend-app']);
    expect(wbs.updates.addedNodeIds).toEqual(['frontend-app']);
  });

  it('maps architecture to task flow view data', () => {
    const taskFlow = architectureToTaskFlowView(sampleArchitecture);

    expect(taskFlow.version).toBe('flowchart.v1');
    expect(taskFlow.title).toBe(sampleArchitecture.title);
    expect(taskFlow.nodes).toHaveLength(3);
    expect(taskFlow.nodes.find((node) => node.id === 'frontend-app')?.type).toBe('start');
    expect(taskFlow.nodes.find((node) => node.id === 'postgres-db')?.type).toBe('io');
    expect(taskFlow.edges[0]?.type).toBe('sequence');
    expect(taskFlow.edges[1]?.type).toBe('condition');
    expect(taskFlow.updates.addedEdgeIds).toEqual(['frontend-api']);
  });
});
