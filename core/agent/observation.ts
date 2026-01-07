import 'server-only';

// 运行态可供下一轮 Planner 使用的上下文
export type Observation = {
  // 上一轮 emit 的结果列表
  outputs: unknown[];
  // 可选的备注/系统提示
  notes?: string[];
  // 自定义上下文（如环境、配置等）
  context?: Record<string, unknown>;
};