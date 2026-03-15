import 'server-only';

import { LLMProvider, LLMProviderName } from '../types';
import type { LLMRawResponse, Message } from '@/core/types';

function getLastUserMessage(prompt: Message[]): string {
  const message = [...prompt].reverse().find((item) => item.role === 'user');
  return message?.content?.trim() || 'mock task';
}

function includesSchema(prompt: Message[], marker: string): boolean {
  return prompt.some((item) => item.content.includes(marker));
}

function buildPlanMock(input: string) {
  return {
    goal: input,
    steps: [
      {
        action: 'analyze',
        params: { input },
      },
      {
        action: 'emit',
        params: { content: `Mock output for: ${input}` },
      },
    ],
  };
}

function buildWbsMock(input: string) {
  return {
    version: 'wbs.v1' as const,
    goal: input,
    nodes: [
      {
        id: 'goal-1',
        title: input,
        type: 'goal' as const,
        status: 'todo' as const,
        parentId: null,
        dependsOn: [],
        notes: [],
      },
      {
        id: 'task-1',
        title: '需求拆解',
        type: 'task' as const,
        status: 'todo' as const,
        parentId: 'goal-1',
        dependsOn: [],
        notes: ['mock fallback'],
      },
      {
        id: 'task-2',
        title: '执行实现',
        type: 'task' as const,
        status: 'todo' as const,
        parentId: 'goal-1',
        dependsOn: ['task-1'],
        notes: ['mock fallback'],
      },
    ],
    edges: [
      { from: 'goal-1', to: 'task-1', type: 'parent' as const },
      { from: 'goal-1', to: 'task-2', type: 'parent' as const },
      { from: 'task-1', to: 'task-2', type: 'dependency' as const },
    ],
    updates: {
      addedNodeIds: ['goal-1', 'task-1', 'task-2'],
      updatedNodeIds: [],
      removedNodeIds: [],
    },
  };
}

function buildFlowchartMock(input: string) {
  return {
    version: 'flowchart.v1' as const,
    title: input,
    nodes: [
      {
        id: 'start-1',
        label: '开始',
        type: 'start' as const,
        status: 'todo' as const,
        metadata: { description: '流程开始' },
      },
      {
        id: 'task-1',
        label: '分析任务',
        type: 'task' as const,
        status: 'doing' as const,
        metadata: { description: '解析输入并准备执行' },
      },
      {
        id: 'end-1',
        label: '结束',
        type: 'end' as const,
        status: 'todo' as const,
        metadata: { description: '流程结束' },
      },
    ],
    edges: [
      { from: 'start-1', to: 'task-1', type: 'sequence' as const, label: '进入' },
      { from: 'task-1', to: 'end-1', type: 'sequence' as const, label: '完成' },
    ],
    updates: {
      addedNodeIds: ['start-1', 'task-1', 'end-1'],
      updatedNodeIds: [],
      removedNodeIds: [],
      addedEdgeIds: ['start-1->task-1', 'task-1->end-1'],
      removedEdgeIds: [],
    },
  };
}

export class MockProvider implements LLMProvider {
  name: LLMProviderName = 'mock';

  async call(prompt: Message[]): Promise<LLMRawResponse> {
    const input = getLastUserMessage(prompt);

    let content = JSON.stringify(buildPlanMock(input));

    if (includesSchema(prompt, '"version": "wbs.v1"')) {
      content = JSON.stringify(buildWbsMock(input));
    } else if (includesSchema(prompt, '"version": "flowchart.v1"')) {
      content = JSON.stringify(buildFlowchartMock(input));
    }

    return {
      content,
      meta: {
        id: 'mock-id',
        created: Date.now(),
        model: 'mock-model',
        provider: this.name,
      },
    };
  }
}
