import z from 'zod';

/**
 * 架构组件类型枚举
 * @description 定义系统中可能出现的组件类型
 */
export const ArchitectureComponentType = z.enum([
  'frontend',      // 前端应用
  'backend',       // 后端服务
  'database',      // 数据库
  'cache',         // 缓存服务
  'queue',         // 消息队列
  'api-gateway',   // API 网关
  'auth-service',  // 认证服务
  'storage',       // 对象存储
  'cdn',           // CDN
  'external-api',  // 外部 API
]);

/**
 * 架构层枚举
 * @description 定义分层架构中的各层
 */
export const ArchitectureLayer = z.enum([
  'presentation',  // 表现层
  'application',   // 应用层
  'domain',        // 领域层
  'infrastructure',// 基础设施层
  'data',          // 数据层
]);

/**
 * 连接类型枚举
 * @description 定义组件间的连接类型
 */
export const ArchitectureConnectionType = z.enum([
  'http',          // HTTP 请求
  'websocket',     // WebSocket
  'tcp',           // TCP 连接
  'grpc',          // gRPC
  'database',      // 数据库连接
  'cache',         // 缓存连接
  'queue',         // 队列消息
  'file',          // 文件读写
]);

/**
 * 架构组件定义 Schema
 * @description 定义单个架构组件的结构
 */
export const ArchitectureComponentSchema = z.object({
  id: z.string().min(1, 'Component ID must be non-empty'),
  name: z.string().min(1, 'Component name must be non-empty'),
  type: ArchitectureComponentType,
  layer: ArchitectureLayer,
  description: z.string().optional(),
  technology: z.string().optional(),  // 具体技术栈，如 React, PostgreSQL
  metadata: z.object({
    port: z.number().optional(),
    replicas: z.number().optional(),
    features: z.array(z.string()).optional(),  // 功能特性
  }).optional(),
});

/**
 * 架构连接定义 Schema
 * @description 定义组件间的连接关系
 */
export const ArchitectureConnectionSchema = z.object({
  id: z.string().min(1, 'Connection ID must be non-empty'),
  from: z.string().min(1, 'From component ID must be non-empty'),
  to: z.string().min(1, 'To component ID must be non-empty'),
  type: ArchitectureConnectionType,
  label: z.string().optional(),  // 连接说明
  description: z.string().optional(),
});

/**
 * 技术栈定义 Schema
 * @description 定义技术选型项的结构
 */
export const TechStackSchema = z.object({
  category: z.string(),  // 分类：前端、后端、数据库等
  name: z.string(),      // 技术名称
  version: z.string().optional(),
  reason: z.string().optional(),  // 选型理由
});

/**
 * 完整架构图 Schema
 * @description 定义完整的系统架构输出结构，包含组件、连接、技术栈和决策
 */
export const ArchitectureSchema = z.object({
  version: z.literal('arch.v1'),
  title: z.string().min(1, 'Architecture title is required'),
  description: z.string().optional(),

  // 架构风格
  style: z.enum(['monolith', 'microservice', 'serverless', 'hybrid']).optional(),

  // 架构层划分
  layers: z.array(z.object({
    name: ArchitectureLayer,
    description: z.string().optional(),
  })),

  // 核心组件
  components: z.array(ArchitectureComponentSchema).min(1, 'At least one component is required'),

  // 组件间的连接
  connections: z.array(ArchitectureConnectionSchema).default([]),

  // 技术栈清单
  techStack: z.array(TechStackSchema).default([]),

  // 关键决策说明
  decisions: z.array(z.object({
    topic: z.string(),      // 决策主题
    choice: z.string(),     // 选择方案
    reason: z.string(),     // 选择理由
    alternatives: z.array(z.string()).optional(),  // 备选方案
  })).optional(),

  // 增量更新支持
  updates: z.object({
    addedComponentIds: z.array(z.string()).default([]),
    updatedComponentIds: z.array(z.string()).default([]),
    removedComponentIds: z.array(z.string()).default([]),
    addedConnectionIds: z.array(z.string()).default([]),
    removedConnectionIds: z.array(z.string()).default([]),
  }).default({
    addedComponentIds: [],
    updatedComponentIds: [],
    removedComponentIds: [],
    addedConnectionIds: [],
    removedConnectionIds: [],
  }),
});

// 导出类型
/** 架构组件类型 */
export type ArchitectureComponent = z.infer<typeof ArchitectureComponentSchema>;
/** 架构连接类型 */
export type ArchitectureConnection = z.infer<typeof ArchitectureConnectionSchema>;
/** 技术栈类型 */
export type TechStack = z.infer<typeof TechStackSchema>;
/** 完整架构类型 */
export type Architecture = z.infer<typeof ArchitectureSchema>;