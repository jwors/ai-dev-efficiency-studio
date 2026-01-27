import type { Plugin, PluginResult } from './types';
import type { SessionState } from '../types/type';

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
