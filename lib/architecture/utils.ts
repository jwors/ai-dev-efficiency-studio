import type { Node } from '@xyflow/react';
import type { ArchitectureComponentType, ArchitectureLayer } from '@/core/types';

/**
 * 组件类型选项列表
 */
export const COMPONENT_TYPE_OPTIONS: Array<{
  value: ArchitectureComponentType;
  label: string;
}> = [
  { value: 'frontend', label: '前端应用' },
  { value: 'backend', label: '后端服务' },
  { value: 'database', label: '数据库' },
  { value: 'cache', label: '缓存服务' },
  { value: 'queue', label: '消息队列' },
  { value: 'api-gateway', label: 'API 网关' },
  { value: 'auth-service', label: '认证服务' },
  { value: 'storage', label: '对象存储' },
  { value: 'cdn', label: 'CDN' },
  { value: 'external-api', label: '外部 API' },
];

/**
 * 架构层选项列表
 */
export const ARCHITECTURE_LAYER_OPTIONS: Array<{
  value: ArchitectureLayer;
  label: string;
}> = [
  { value: 'presentation', label: '表现层' },
  { value: 'application', label: '应用层' },
  { value: 'domain', label: '领域层' },
  { value: 'infrastructure', label: '基础设施层' },
  { value: 'data', label: '数据层' },
];

/**
 * 生成唯一的组件 ID
 * 基于名称生成，如果已存在则追加数字后缀
 *
 * @param name - 组件名称
 * @param existingIds - 已存在的 ID 集合
 * @returns 唯一的组件 ID
 */
export function generateComponentId(name: string, existingIds: Set<string>): string {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  if (!base) {
    return generateComponentId('component', existingIds);
  }

  let id = base;
  let counter = 1;

  while (existingIds.has(id)) {
    id = `${base}-${counter}`;
    counter++;
  }

  return id;
}

/**
 * 计算新节点的默认位置
 * 在最右侧节点的右边放置新节点
 *
 * @param nodes - 现有节点数组
 * @returns 新节点的默认位置
 */
export function getDefaultPosition(nodes: Node[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 100, y: 100 };
  }

  // 找到最右侧的节点
  const rightmostNode = nodes.reduce((max, node) =>
    node.position.x > max.position.x ? node : max
  );

  return {
    x: rightmostNode.position.x + 280,
    y: rightmostNode.position.y,
  };
}

/**
 * 验证组件名称
 *
 * @param name - 组件名称
 * @returns 验证结果
 */
export function validateComponentName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: '组件名称不能为空' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: '组件名称不能超过 50 个字符' };
  }

  return { valid: true };
}