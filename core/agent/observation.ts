import 'server-only';

export type Observation = {
  outputs: unknown[];
  notes?: string[];
  context?: Record<string, unknown>;
};
