import type { ArchitectureJson } from '@/core/types';

/**
 * 架构模板分类
 */
export type TemplateCategory = 'web' | 'microservice' | 'serverless' | 'data' | 'mobile';

/**
 * 架构模板定义
 */
export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  architecture: Omit<ArchitectureJson, 'updates'>;
}

/**
 * 预设模板列表
 */
export const ARCHITECTURE_TEMPLATES: ArchitectureTemplate[] = [
  {
    id: 'admin-dashboard',
    name: '后台管理系统',
    description: '经典的前后端分离架构，适用于管理后台、CMS 等场景',
    category: 'web',
    tags: ['admin', 'cms', 'monolith'],
    architecture: {
      version: 'arch.v1',
      title: '后台管理系统架构',
      style: 'monolith',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'data' },
      ],
      components: [
        { id: 'web-frontend', name: 'Web 前端', type: 'frontend', layer: 'presentation', technology: 'React' },
        { id: 'api-server', name: 'API 服务', type: 'backend', layer: 'application', technology: 'Node.js' },
        { id: 'auth-service', name: '认证服务', type: 'auth-service', layer: 'application', technology: 'JWT' },
        { id: 'mysql', name: 'MySQL 数据库', type: 'database', layer: 'data', technology: 'MySQL' },
        { id: 'redis', name: 'Redis 缓存', type: 'cache', layer: 'data', technology: 'Redis' },
      ],
      connections: [
        { id: 'conn-1', from: 'web-frontend', to: 'api-server', type: 'http', label: 'REST API' },
        { id: 'conn-2', from: 'api-server', to: 'auth-service', type: 'http', label: '验证 Token' },
        { id: 'conn-3', from: 'api-server', to: 'mysql', type: 'database' },
        { id: 'conn-4', from: 'api-server', to: 'redis', type: 'cache' },
      ],
      techStack: [
        { category: 'frontend', name: 'React', version: '18.x' },
        { category: 'backend', name: 'Node.js', version: '20.x' },
        { category: 'database', name: 'MySQL', version: '8.x' },
        { category: 'cache', name: 'Redis', version: '7.x' },
      ],
    },
  },
  {
    id: 'e-commerce',
    name: '电商平台',
    description: '微服务架构的电商平台，支持用户、商品、订单、支付等核心模块',
    category: 'microservice',
    tags: ['e-commerce', 'microservice', 'high-traffic'],
    architecture: {
      version: 'arch.v1',
      title: '电商平台架构',
      style: 'microservice',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'domain' },
        { name: 'infrastructure' },
        { name: 'data' },
      ],
      components: [
        { id: 'web-app', name: 'Web 应用', type: 'frontend', layer: 'presentation', technology: 'Next.js' },
        { id: 'mobile-app', name: '移动应用', type: 'frontend', layer: 'presentation', technology: 'React Native' },
        { id: 'api-gateway', name: 'API 网关', type: 'api-gateway', layer: 'application', technology: 'Kong' },
        { id: 'user-service', name: '用户服务', type: 'backend', layer: 'domain' },
        { id: 'product-service', name: '商品服务', type: 'backend', layer: 'domain' },
        { id: 'order-service', name: '订单服务', type: 'backend', layer: 'domain' },
        { id: 'payment-service', name: '支付服务', type: 'backend', layer: 'domain' },
        { id: 'message-queue', name: '消息队列', type: 'queue', layer: 'infrastructure', technology: 'RabbitMQ' },
        { id: 'user-db', name: '用户数据库', type: 'database', layer: 'data', technology: 'PostgreSQL' },
        { id: 'product-db', name: '商品数据库', type: 'database', layer: 'data', technology: 'MongoDB' },
        { id: 'order-db', name: '订单数据库', type: 'database', layer: 'data', technology: 'MySQL' },
        { id: 'redis-cluster', name: 'Redis 集群', type: 'cache', layer: 'data', technology: 'Redis Cluster' },
      ],
      connections: [
        { id: 'conn-1', from: 'web-app', to: 'api-gateway', type: 'http' },
        { id: 'conn-2', from: 'mobile-app', to: 'api-gateway', type: 'http' },
        { id: 'conn-3', from: 'api-gateway', to: 'user-service', type: 'grpc' },
        { id: 'conn-4', from: 'api-gateway', to: 'product-service', type: 'grpc' },
        { id: 'conn-5', from: 'api-gateway', to: 'order-service', type: 'grpc' },
        { id: 'conn-6', from: 'order-service', to: 'payment-service', type: 'http' },
        { id: 'conn-7', from: 'order-service', to: 'message-queue', type: 'queue' },
        { id: 'conn-8', from: 'user-service', to: 'user-db', type: 'database' },
        { id: 'conn-9', from: 'product-service', to: 'product-db', type: 'database' },
        { id: 'conn-10', from: 'order-service', to: 'order-db', type: 'database' },
      ],
      techStack: [
        { category: 'frontend', name: 'Next.js' },
        { category: 'gateway', name: 'Kong' },
        { category: 'backend', name: 'Go / Node.js' },
        { category: 'queue', name: 'RabbitMQ' },
        { category: 'database', name: 'PostgreSQL / MySQL / MongoDB' },
        { category: 'cache', name: 'Redis' },
      ],
    },
  },
  {
    id: 'serverless-api',
    name: 'Serverless API',
    description: '无服务器架构，适用于 API 服务、事件驱动场景',
    category: 'serverless',
    tags: ['serverless', 'api', 'event-driven'],
    architecture: {
      version: 'arch.v1',
      title: 'Serverless API 架构',
      style: 'serverless',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'infrastructure' },
        { name: 'data' },
      ],
      components: [
        { id: 'cdn', name: 'CDN', type: 'cdn', layer: 'presentation', technology: 'CloudFront' },
        { id: 'api-gateway', name: 'API Gateway', type: 'api-gateway', layer: 'application', technology: 'AWS API Gateway' },
        { id: 'lambda-auth', name: '认证函数', type: 'auth-service', layer: 'application', technology: 'Lambda' },
        { id: 'lambda-api', name: 'API 函数', type: 'backend', layer: 'application', technology: 'Lambda' },
        { id: 'lambda-worker', name: 'Worker 函数', type: 'backend', layer: 'application', technology: 'Lambda' },
        { id: 'sqs', name: 'SQS 队列', type: 'queue', layer: 'infrastructure', technology: 'SQS' },
        { id: 's3', name: '对象存储', type: 'storage', layer: 'data', technology: 'S3' },
        { id: 'dynamodb', name: 'DynamoDB', type: 'database', layer: 'data', technology: 'DynamoDB' },
      ],
      connections: [
        { id: 'conn-1', from: 'cdn', to: 'api-gateway', type: 'http' },
        { id: 'conn-2', from: 'api-gateway', to: 'lambda-auth', type: 'http' },
        { id: 'conn-3', from: 'api-gateway', to: 'lambda-api', type: 'http' },
        { id: 'conn-4', from: 'lambda-api', to: 'sqs', type: 'queue' },
        { id: 'conn-5', from: 'sqs', to: 'lambda-worker', type: 'queue' },
        { id: 'conn-6', from: 'lambda-api', to: 'dynamodb', type: 'database' },
        { id: 'conn-7', from: 'lambda-worker', to: 's3', type: 'file' },
      ],
      techStack: [
        { category: 'cdn', name: 'CloudFront' },
        { category: 'gateway', name: 'API Gateway' },
        { category: 'compute', name: 'Lambda' },
        { category: 'queue', name: 'SQS' },
        { category: 'storage', name: 'S3' },
        { category: 'database', name: 'DynamoDB' },
      ],
    },
  },
  {
    id: 'realtime-collab',
    name: '实时协作平台',
    description: '支持实时协作的 Web 应用，如在线文档、白板等',
    category: 'web',
    tags: ['realtime', 'collaboration', 'websocket'],
    architecture: {
      version: 'arch.v1',
      title: '实时协作平台架构',
      style: 'hybrid',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'infrastructure' },
        { name: 'data' },
      ],
      components: [
        { id: 'web-client', name: 'Web 客户端', type: 'frontend', layer: 'presentation', technology: 'React' },
        { id: 'api-server', name: 'API 服务', type: 'backend', layer: 'application', technology: 'Node.js' },
        { id: 'ws-server', name: 'WebSocket 服务', type: 'backend', layer: 'application', technology: 'Socket.io' },
        { id: 'presence-service', name: '在线状态服务', type: 'backend', layer: 'application', technology: 'Redis Pub/Sub' },
        { id: 'redis', name: 'Redis', type: 'cache', layer: 'infrastructure', technology: 'Redis' },
        { id: 'postgres', name: 'PostgreSQL', type: 'database', layer: 'data', technology: 'PostgreSQL' },
      ],
      connections: [
        { id: 'conn-1', from: 'web-client', to: 'api-server', type: 'http' },
        { id: 'conn-2', from: 'web-client', to: 'ws-server', type: 'websocket', label: '实时通信' },
        { id: 'conn-3', from: 'ws-server', to: 'presence-service', type: 'http' },
        { id: 'conn-4', from: 'api-server', to: 'postgres', type: 'database' },
        { id: 'conn-5', from: 'presence-service', to: 'redis', type: 'cache' },
      ],
      techStack: [
        { category: 'frontend', name: 'React' },
        { category: 'backend', name: 'Node.js' },
        { category: 'realtime', name: 'Socket.io' },
        { category: 'database', name: 'PostgreSQL' },
        { category: 'cache', name: 'Redis' },
      ],
    },
  },
  {
    id: 'data-pipeline',
    name: '数据管道',
    description: '大数据处理管道架构，支持数据采集、处理、分析',
    category: 'data',
    tags: ['data', 'pipeline', 'analytics'],
    architecture: {
      version: 'arch.v1',
      title: '数据管道架构',
      style: 'hybrid',
      layers: [
        { name: 'infrastructure' },
        { name: 'data' },
      ],
      components: [
        { id: 'kafka', name: 'Kafka', type: 'queue', layer: 'infrastructure', technology: 'Apache Kafka' },
        { id: 'stream-processor', name: '流处理服务', type: 'backend', layer: 'infrastructure', technology: 'Apache Flink' },
        { id: 'batch-processor', name: '批处理服务', type: 'backend', layer: 'infrastructure', technology: 'Apache Spark' },
        { id: 'data-lake', name: '数据湖', type: 'storage', layer: 'data', technology: 'S3 / HDFS' },
        { id: 'data-warehouse', name: '数据仓库', type: 'database', layer: 'data', technology: 'Snowflake' },
        { id: 'redis', name: 'Redis', type: 'cache', layer: 'data', technology: 'Redis' },
      ],
      connections: [
        { id: 'conn-1', from: 'kafka', to: 'stream-processor', type: 'queue' },
        { id: 'conn-2', from: 'kafka', to: 'batch-processor', type: 'queue' },
        { id: 'conn-3', from: 'stream-processor', to: 'data-lake', type: 'file' },
        { id: 'conn-4', from: 'batch-processor', to: 'data-warehouse', type: 'database' },
        { id: 'conn-5', from: 'stream-processor', to: 'redis', type: 'cache' },
      ],
      techStack: [
        { category: 'queue', name: 'Kafka' },
        { category: 'streaming', name: 'Flink' },
        { category: 'batch', name: 'Spark' },
        { category: 'storage', name: 'S3 / HDFS' },
        { category: 'warehouse', name: 'Snowflake' },
      ],
    },
  },
  {
    id: 'mobile-app',
    name: '移动应用后端',
    description: '移动应用的后端服务架构，支持推送、认证、存储',
    category: 'mobile',
    tags: ['mobile', 'api', 'push'],
    architecture: {
      version: 'arch.v1',
      title: '移动应用后端架构',
      style: 'monolith',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'infrastructure' },
        { name: 'data' },
      ],
      components: [
        { id: 'mobile-app', name: '移动应用', type: 'frontend', layer: 'presentation', technology: 'React Native' },
        { id: 'api-server', name: 'API 服务', type: 'backend', layer: 'application', technology: 'Node.js' },
        { id: 'auth-service', name: '认证服务', type: 'auth-service', layer: 'application', technology: 'Firebase Auth' },
        { id: 'push-service', name: '推送服务', type: 'backend', layer: 'application', technology: 'FCM / APNs' },
        { id: 'cdn', name: 'CDN', type: 'cdn', layer: 'infrastructure', technology: 'CloudFront' },
        { id: 'storage', name: '对象存储', type: 'storage', layer: 'data', technology: 'S3' },
        { id: 'postgres', name: 'PostgreSQL', type: 'database', layer: 'data', technology: 'PostgreSQL' },
      ],
      connections: [
        { id: 'conn-1', from: 'mobile-app', to: 'api-server', type: 'http' },
        { id: 'conn-2', from: 'mobile-app', to: 'auth-service', type: 'http', label: 'OAuth' },
        { id: 'conn-3', from: 'api-server', to: 'push-service', type: 'http' },
        { id: 'conn-4', from: 'api-server', to: 'postgres', type: 'database' },
        { id: 'conn-5', from: 'mobile-app', to: 'cdn', type: 'http', label: '静态资源' },
        { id: 'conn-6', from: 'api-server', to: 'storage', type: 'file' },
      ],
      techStack: [
        { category: 'mobile', name: 'React Native' },
        { category: 'backend', name: 'Node.js' },
        { category: 'auth', name: 'Firebase' },
        { category: 'database', name: 'PostgreSQL' },
        { category: 'storage', name: 'S3' },
      ],
    },
  },
];

/**
 * 分类标签映射
 */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  web: 'Web 应用',
  microservice: '微服务',
  serverless: 'Serverless',
  data: '数据处理',
  mobile: '移动应用',
};

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): ArchitectureTemplate | undefined {
  return ARCHITECTURE_TEMPLATES.find((t) => t.id === id);
}

/**
 * 按分类获取模板
 */
export function getTemplatesByCategory(category: TemplateCategory): ArchitectureTemplate[] {
  return ARCHITECTURE_TEMPLATES.filter((t) => t.category === category);
}

/**
 * 从模板创建 ArchitectureJson
 */
export function createFromTemplate(templateId: string): ArchitectureJson | null {
  const template = getTemplateById(templateId);
  if (!template) return null;

  return {
    ...template.architecture,
    updates: {
      addedComponentIds: template.architecture.components.map((c) => c.id),
      updatedComponentIds: [],
      removedComponentIds: [],
      addedConnectionIds: template.architecture.connections.map((c) => c.id),
      removedConnectionIds: [],
    },
  };
}

/**
 * 获取所有分类
 */
export function getAllCategories(): TemplateCategory[] {
  return ['web', 'microservice', 'serverless', 'data', 'mobile'];
}