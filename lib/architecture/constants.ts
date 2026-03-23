import type { ArchitectureJson } from '@/core/types';

// 组件类型对应的颜色
export const COMPONENT_COLORS: Record<string, string> = {
  frontend: '#3b82f6',
  backend: '#10b981',
  database: '#f59e0b',
  cache: '#ef4444',
  queue: '#8b5cf6',
  'api-gateway': '#06b6d4',
  'auth-service': '#ec4899',
  storage: '#6366f1',
  cdn: '#14b8a6',
  'external-api': '#64748b',
  default: '#60a5fa',
};

// 连接类型对应的样式
export const CONNECTION_STYLES: Record<
  string,
  { stroke: string; strokeDasharray?: string }
> = {
  http: { stroke: '#3b82f6' },
  websocket: { stroke: '#10b981', strokeDasharray: '5,5' },
  tcp: { stroke: '#f59e0b' },
  grpc: { stroke: '#8b5cf6' },
  database: { stroke: '#ef4444' },
  cache: { stroke: '#ec4899', strokeDasharray: '3,3' },
  queue: { stroke: '#06b6d4', strokeDasharray: '8,4' },
  file: { stroke: '#6366f1' },
};

// 架构层对应的图标
export const LAYER_ICONS: Record<string, string> = {
  presentation: '🖥️',
  application: '⚙️',
  domain: '📦',
  infrastructure: '🔧',
  data: '💾',
};

// 动画连接类型
export const ANIMATED_CONNECTION_TYPES = ['http', 'websocket', 'queue'];

/**
 * 连接类型选项列表
 * 用于编辑模式下选择连线类型
 */
export const CONNECTION_TYPE_OPTIONS: Array<{
  value: string;
  label: string;
  color: string;
}> = [
  { value: 'http', label: 'HTTP', color: '#3b82f6' },
  { value: 'websocket', label: 'WebSocket', color: '#10b981' },
  { value: 'tcp', label: 'TCP', color: '#f59e0b' },
  { value: 'grpc', label: 'gRPC', color: '#8b5cf6' },
  { value: 'database', label: 'Database', color: '#ef4444' },
  { value: 'cache', label: 'Cache', color: '#ec4899' },
  { value: 'queue', label: 'Queue', color: '#06b6d4' },
  { value: 'file', label: 'File', color: '#6366f1' },
];