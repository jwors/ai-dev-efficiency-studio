import type { SessionState } from '@/core/types';

/**
 * 插件执行结果类型。
 * @template T - 返回数据类型
 */
export type PluginResult<T = unknown> = {
  /** 插件名称 */
  name: string;
  /** 执行是否成功 */
  ok: boolean;
  /** 返回的数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
};

/**
 * 插件接口定义。
 * 所有插件必须实现此接口。
 * @template T - 返回数据类型
 */
export interface Plugin<T = unknown> {
  /** 插件名称 */
  name: string;
  /**
   * 运行插件。
   * @param input - 用户输入
   * @param state - 会话状态
   * @returns 插件执行结果
   */
  run(input: string, state: SessionState): Promise<PluginResult<T>>;
}
