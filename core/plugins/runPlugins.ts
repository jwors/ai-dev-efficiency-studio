import type { Plugin, PluginResult } from './types';
import type { SessionState } from '@/core/types';

/**
 * 运行所有插件并收集结果。
 * 按顺序执行每个插件的 run 方法，捕获异常并返回统一的结果格式。
 * @param plugins - 插件数组
 * @param input - 用户输入
 * @param state - 会话状态
 * @returns 所有插件的执行结果数组
 */
export async function runPlugins(
  plugins: Plugin[],
  input: string,
  state: SessionState,
): Promise<PluginResult[]> {
  const results: PluginResult[] = [];
  for (const plugin of plugins) {
    try {
      const res = await plugin.run(input, state);
      results.push(res);
    } catch (error) {
      results.push({
        name: plugin.name,
        ok: false,
        error: error instanceof Error ? error.message : 'Plugin failed',
      });
    }
  }
  return results;
}
