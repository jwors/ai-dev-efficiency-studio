import type { SessionState } from '../types/type';

export type PluginResult<T = unknown> = {
  name: string;
  ok: boolean;
  data?: T;
  error?: string;
};

export interface Plugin<T = unknown> {
  name: string;
  run(input: string, state: SessionState): Promise<PluginResult<T>>;
}
