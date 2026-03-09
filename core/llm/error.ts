import 'server-only';
import type { LLMProviderName } from './types';

export type LLMErrorKind =
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'server'
  | 'bad_request'
  | 'auth'
  | 'unknown';

export class LLMError extends Error {
  kind: LLMErrorKind;
  provider?: LLMProviderName;
  statusCode?: number;
  code?: string;
  retryAfterMs?: number;
  cause?: unknown;

  constructor(message: string, options: {
    kind: LLMErrorKind;
    provider?: LLMProviderName;
    statusCode?: number;
    code?: string;
    retryAfterMs?: number;
    cause?: unknown;
  }) {
    super(message);
    this.name = 'LLMError';
    this.kind = options.kind;
    this.provider = options.provider;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.retryAfterMs = options.retryAfterMs;
    this.cause = options.cause;
  }
}

export function mapHttpStatusToKind(status: number): LLMErrorKind {
  if (status === 429) return 'rate_limit';
  if (status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';
  if (status >= 400) return 'bad_request';
  return 'unknown';
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof LLMError) {
    return (
      error.kind === 'rate_limit' ||
      error.kind === 'timeout' ||
      error.kind === 'network' ||
      error.kind === 'server'
    );
  }
  return false;
}

export function normalizeLLMError(
  error: unknown,
  provider?: LLMProviderName,
): LLMError {
  if (error instanceof LLMError) {
    if (provider && !error.provider) {
      error.provider = provider;
    }
    return error;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new LLMError(error.message || 'LLM timeout', {
        kind: 'timeout',
        provider,
        cause: error,
      });
    }

    if (error.name === 'TypeError') {
      return new LLMError(error.message || 'LLM network error', {
        kind: 'network',
        provider,
        cause: error,
      });
    }

    return new LLMError(error.message, {
      kind: 'unknown',
      provider,
      cause: error,
    });
  }

  return new LLMError('Unknown LLM error', {
    kind: 'unknown',
    provider,
    cause: error,
  });
}
