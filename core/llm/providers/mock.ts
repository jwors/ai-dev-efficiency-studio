import 'server-only';

import { LLMProvider, LLMProviderName } from '../types';
import type { LLMRawResponse, Message } from '@/core/types';

/**
 * 从提示消息中获取最后一条用户消息。
 * @param prompt - 消息数组
 * @returns 最后一条用户消息的内容，不存在时返回默认字符串
 */
function getLastUserMessage(prompt: Message[]): string {
  const message = [...prompt].reverse().find((item) => item.role === 'user');
  return message?.content?.trim() || 'mock task';
}

/**
 * 检查消息数组中是否包含特定标记。
 * @param prompt - 消息数组
 * @param marker - 要查找的标记字符串
 * @returns 如果包含标记返回 true
 */
function includesSchema(prompt: Message[], marker: string): boolean {
  return prompt.some((item) => item.content.includes(marker));
}

/**
 * 构建模拟 Plan 响应数据。
 * @param input - 用户输入
 * @returns 模拟的 Plan 对象
 */
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

/**
 * 构建模拟 WBS 响应数据。
 * @param input - 用户输入
 * @returns 模拟的 WBS 图对象
 */
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

/**
 * 构建模拟流程图响应数据。
 * @param input - 用户输入
 * @returns 模拟的流程图对象
 */
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

/**
 * 构建模拟架构图响应数据。
 * @param input - 用户输入
 * @returns 模拟的架构图对象
 */
function buildArchitectureMock(input: string) {
  return {
    version: 'arch.v1' as const,
    title: input.includes('后台') ? '后台管理系统' : input.includes('电商') ? '电商平台' : '系统架构',
    description: `基于用户需求"${input}"设计的系统架构`,
    style: 'monolith' as const,
    layers: [
      { name: 'presentation' as const, description: '前端界面层' },
      { name: 'application' as const, description: '应用服务层' },
      { name: 'data' as const, description: '数据存储层' },
    ],
    components: [
      {
        id: 'frontend-app',
        name: '前端应用',
        type: 'frontend' as const,
        layer: 'presentation' as const,
        description: '用户界面',
        technology: 'React + TypeScript',
        metadata: { features: ['响应式设计', '状态管理'] },
      },
      {
        id: 'api-server',
        name: 'API 服务',
        type: 'backend' as const,
        layer: 'application' as const,
        description: 'RESTful API 服务',
        technology: 'Node.js + Express',
        metadata: { port: 3001 },
      },
      {
        id: 'postgres-db',
        name: 'PostgreSQL 数据库',
        type: 'database' as const,
        layer: 'data' as const,
        description: '主数据库',
        technology: 'PostgreSQL 15',
      },
      {
        id: 'redis-cache',
        name: 'Redis 缓存',
        type: 'cache' as const,
        layer: 'infrastructure' as const,
        description: '缓存服务',
        technology: 'Redis 7',
      },
    ],
    connections: [
      {
        id: 'frontend-to-api',
        from: 'frontend-app',
        to: 'api-server',
        type: 'http' as const,
        label: 'REST API',
        description: '前端调用后端 API',
      },
      {
        id: 'api-to-db',
        from: 'api-server',
        to: 'postgres-db',
        type: 'database' as const,
        description: 'API 读写数据库',
      },
      {
        id: 'api-to-redis',
        from: 'api-server',
        to: 'redis-cache',
        type: 'cache' as const,
        description: 'API 读写缓存',
      },
    ],
    techStack: [
      { category: '前端框架', name: 'React', version: '18', reason: '生态成熟' },
      { category: '后端框架', name: 'Express', version: '4', reason: '轻量灵活' },
      { category: '数据库', name: 'PostgreSQL', version: '15', reason: '开源稳定' },
      { category: '缓存', name: 'Redis', version: '7', reason: '高性能' },
    ],
    decisions: [
      {
        topic: '架构风格',
        choice: '单体架构',
        reason: '初期项目规模较小，开发效率高',
        alternatives: ['微服务架构'],
      },
    ],
    updates: {
      addedComponentIds: ['frontend-app', 'api-server', 'postgres-db', 'redis-cache'],
      updatedComponentIds: [],
      removedComponentIds: [],
      addedConnectionIds: ['frontend-to-api', 'api-to-db', 'api-to-redis'],
      removedConnectionIds: [],
    },
  };
}

/**
 * Mock LLM 提供者。
 * 用于测试和开发环境，根据提示消息类型返回预定义的模拟响应。
 */
export class MockProvider implements LLMProvider {
  name: LLMProviderName = 'mock';

  /**
   * 调用 Mock 提供者生成响应。
   * 根据消息中的 Schema 标记返回对应的模拟数据。
   * @param prompt - 消息数组
   * @returns 模拟的 LLM 响应
   */
  async call(prompt: Message[]): Promise<LLMRawResponse> {
    const input = getLastUserMessage(prompt);

    let content = JSON.stringify(buildPlanMock(input));

    if (includesSchema(prompt, '"version": "wbs.v1"')) {
      content = JSON.stringify(buildWbsMock(input));
    } else if (includesSchema(prompt, '"version": "flowchart.v1"')) {
      content = JSON.stringify(buildFlowchartMock(input));
    } else if (includesSchema(prompt, '"version": "arch.v1"')) {
      content = JSON.stringify(buildArchitectureMock(input));
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
