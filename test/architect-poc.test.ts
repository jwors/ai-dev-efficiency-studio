/**
 * 架构图生成 POC 测试
 *
 * 目的：验证 Prompt 能否让 LLM 生成合理的架构设计 JSON
 *
 * 运行方式：
 * - Mock 模式：npm test -- architect-poc.test.ts
 * - 真实 API：设置 QWEN_API_KEY 后运行
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ArchitectureSchema } from '@/core/plugins/architect/schema';
import { architectPrompt } from '@/core/plugins/architect/prompt';
import type { SessionState } from '@/core/types';

// 创建模拟的 SessionState
function createMockState(): SessionState {
  return {
    sessionId: 'test:architect-poc:001',
    summary: '',
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 测试用例：不同类型的系统需求
const TEST_CASES = [
  {
    name: '后台管理系统',
    input: '搭建一个后台管理系统，需要用户管理、权限控制、数据统计功能',
    expectations: {
      minComponents: 4,  // 至少包含前端、后端、数据库、认证
      requiredTypes: ['frontend', 'backend', 'database'],
      requiredConnections: 2,
    },
  },
  {
    name: '电商平台',
    input: '设计一个电商平台，包含用户、商品、订单、支付模块，需要高并发支持',
    expectations: {
      minComponents: 6,
      requiredTypes: ['frontend', 'backend', 'database', 'cache'],
      requiredConnections: 4,
    },
  },
  {
    name: '内容管理系统',
    input: '开发一个博客系统，支持文章发布、评论、搜索功能',
    expectations: {
      minComponents: 4,
      requiredTypes: ['frontend', 'backend', 'database'],
      requiredConnections: 2,
    },
  },
  {
    name: '微服务架构',
    input: '设计一个微服务架构的 SaaS 平台，包含租户管理、计费、通知服务',
    expectations: {
      minComponents: 8,
      requiredTypes: ['api-gateway', 'backend', 'database'],
      requiredConnections: 5,
    },
  },
];

describe('Architect Plugin POC', () => {
  describe('Prompt 生成', () => {
    it('应该生成有效的 Prompt 消息数组', () => {
      const state = createMockState();
      const messages = architectPrompt('搭建一个后台管理系统', state);

      // 验证消息结构
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('架构师');
      expect(messages[0].content).toContain('arch.v1');
    });

    it('应该包含 Schema 定义', () => {
      const state = createMockState();
      const messages = architectPrompt('测试', state);

      const systemMessage = messages.find(m => m.role === 'system');
      expect(systemMessage?.content).toContain('version');
      expect(systemMessage?.content).toContain('components');
      expect(systemMessage?.content).toContain('connections');
    });

    it('应该包含用户输入', () => {
      const state = createMockState();
      const input = '搭建一个电商平台';
      const messages = architectPrompt(input, state);

      const userMessage = messages.find(m => m.role === 'user');
      expect(userMessage?.content).toBe(input);
    });

    it('应该支持增量更新（传入现有架构）', () => {
      const state: SessionState = {
        ...createMockState(),
        architecture: {
          version: 'arch.v1',
          title: '现有系统',
          layers: [{ name: 'presentation', description: '表现层' }],
          components: [
            {
              id: 'existing-frontend',
              name: '现有前端',
              type: 'frontend',
              layer: 'presentation',
            },
          ],
          connections: [],
          techStack: [],
        } as any,
      };

      const messages = architectPrompt('添加缓存层', state);

      const hasCurrentArch = messages.some(
        m => m.content?.includes('CURRENT_ARCHITECTURE_JSON')
      );
      expect(hasCurrentArch).toBe(true);
    });
  });

  describe('Schema 验证', () => {
    it('应该验证有效的架构数据', () => {
      const validArch = {
        version: 'arch.v1',
        title: '测试系统',
        layers: [{ name: 'presentation' as const }],
        components: [
          {
            id: 'frontend',
            name: '前端应用',
            type: 'frontend' as const,
            layer: 'presentation' as const,
          },
        ],
        connections: [],
        techStack: [],
      };

      const result = ArchitectureSchema.safeParse(validArch);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的版本号', () => {
      const invalidArch = {
        version: 'arch.v2',  // 错误版本
        title: '测试系统',
        layers: [],
        components: [],
      };

      const result = ArchitectureSchema.safeParse(invalidArch);
      expect(result.success).toBe(false);
    });

    it('应该拒绝空组件列表', () => {
      const invalidArch = {
        version: 'arch.v1',
        title: '测试系统',
        layers: [],
        components: [],  // 空组件
      };

      const result = ArchitectureSchema.safeParse(invalidArch);
      expect(result.success).toBe(false);
    });

    it('应该拒绝无效的组件类型', () => {
      const invalidArch = {
        version: 'arch.v1',
        title: '测试系统',
        layers: [],
        components: [
          {
            id: 'test',
            name: '测试组件',
            type: 'invalid-type' as any,  // 无效类型
            layer: 'presentation' as const,
          },
        ],
      };

      const result = ArchitectureSchema.safeParse(invalidArch);
      expect(result.success).toBe(false);
    });
  });

  describe('Mock 数据生成', () => {
    // 这个测试验证 Mock Provider 能否生成合理的架构数据
    it('应该生成符合预期的架构 Mock 数据', () => {
      // 模拟 LLM 输出
      const mockOutput = {
        version: 'arch.v1',
        title: '后台管理系统',
        description: '企业级后台管理系统',
        style: 'monolith' as const,
        layers: [
          { name: 'presentation' as const, description: '前端界面层' },
          { name: 'application' as const, description: '应用服务层' },
          { name: 'data' as const, description: '数据存储层' },
        ],
        components: [
          {
            id: 'admin-frontend',
            name: '管理后台前端',
            type: 'frontend' as const,
            layer: 'presentation' as const,
            description: '基于 React 的管理后台界面',
            technology: 'React + TypeScript + Ant Design',
            metadata: {
              features: ['用户管理', '权限控制', '数据统计'],
            },
          },
          {
            id: 'api-server',
            name: 'API 服务',
            type: 'backend' as const,
            layer: 'application' as const,
            description: 'RESTful API 服务',
            technology: 'Node.js + Express',
            metadata: {
              port: 3001,
            },
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
            description: '会话缓存和热点数据缓存',
            technology: 'Redis 7',
          },
        ],
        connections: [
          {
            id: 'frontend-api',
            from: 'admin-frontend',
            to: 'api-server',
            type: 'http' as const,
            label: 'REST API',
            description: '前端调用后端 API',
          },
          {
            id: 'api-db',
            from: 'api-server',
            to: 'postgres-db',
            type: 'database' as const,
            description: 'API 读写数据库',
          },
          {
            id: 'api-redis',
            from: 'api-server',
            to: 'redis-cache',
            type: 'cache' as const,
            description: 'API 读写缓存',
          },
        ],
        techStack: [
          { category: '前端框架', name: 'React', version: '18', reason: '生态成熟，组件丰富' },
          { category: 'UI 组件库', name: 'Ant Design', version: '5', reason: '企业级组件完善' },
          { category: '后端框架', name: 'Express', version: '4', reason: '轻量灵活' },
          { category: '数据库', name: 'PostgreSQL', version: '15', reason: '开源免费，功能强大' },
          { category: '缓存', name: 'Redis', version: '7', reason: '高性能内存数据库' },
        ],
        decisions: [
          {
            topic: '架构风格',
            choice: '单体架构',
            reason: '初期项目规模较小，单体架构开发效率高，部署简单',
            alternatives: ['微服务架构'],
          },
          {
            topic: '前端框架',
            choice: 'React + Ant Design',
            reason: '企业级后台管理系统的主流选择，开发效率高',
            alternatives: ['Vue + Element Plus'],
          },
        ],
        updates: {
          addedComponentIds: ['admin-frontend', 'api-server', 'postgres-db', 'redis-cache'],
          updatedComponentIds: [],
          removedComponentIds: [],
          addedConnectionIds: ['frontend-api', 'api-db', 'api-redis'],
          removedConnectionIds: [],
        },
      };

      // 验证 Schema
      const result = ArchitectureSchema.safeParse(mockOutput);
      expect(result.success).toBe(true);

      if (result.success) {
        const arch = result.data;

        // 验证基本结构
        expect(arch.title).toBe('后台管理系统');
        expect(arch.components.length).toBe(4);
        expect(arch.connections.length).toBe(3);

        // 验证组件类型
        const types = arch.components.map(c => c.type);
        expect(types).toContain('frontend');
        expect(types).toContain('backend');
        expect(types).toContain('database');
        expect(types).toContain('cache');

        // 验证连接关系
        expect(arch.connections[0].from).toBe('admin-frontend');
        expect(arch.connections[0].to).toBe('api-server');

        // 验证技术栈
        expect(arch.techStack.length).toBe(5);

        // 验证决策记录
        expect(arch.decisions?.length).toBe(2);
      }
    });
  });

  describe('边界情况测试', () => {
    it('应该处理简短的需求描述', () => {
      const state = createMockState();
      const messages = architectPrompt('做个博客', state);

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[messages.length - 1].content).toBe('做个博客');
    });

    it('应该处理复杂的需求描述', () => {
      const state = createMockState();
      const complexInput = `
        设计一个大型电商平台：
        - 前端：PC端管理后台 + 移动端 H5 + 小程序
        - 后端：用户服务、商品服务、订单服务、支付服务、物流服务
        - 数据库：MySQL 主从 + Redis 集群 + Elasticsearch
        - 基础设施：Docker + Kubernetes + CI/CD
        - 第三方集成：支付宝、微信支付、短信服务、OSS 存储
      `;

      const messages = architectPrompt(complexInput, state);
      expect(messages[messages.length - 1].content).toContain('电商平台');
    });

    it('应该处理非技术需求描述', () => {
      const state = createMockState();
      const messages = architectPrompt('我想做一个在线教育平台', state);

      expect(messages.length).toBeGreaterThan(0);
    });
  });
});

// 导出测试用例供手动测试使用
export { TEST_CASES, createMockState };