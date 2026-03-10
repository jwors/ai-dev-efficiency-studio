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

  /**
   * 创建 LLM 错误实例。
   * @param message - 错误消息
   * @param options - 错误选项，包含错误类型、提供者、状态码等信息
   */
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

/**
 * 将 HTTP 状态码映射为 LLM 错误类型。
 * @param status - HTTP 状态码
 * @returns 对应的 LLM 错误类型
 */
export function mapHttpStatusToKind(status: number): LLMErrorKind {
  if (status === 429) return 'rate_limit';
  if (status === 401 || status === 403) return 'auth';
  if (status >= 500) return 'server';
  if (status >= 400) return 'bad_request';
  return 'unknown';
}

/**
 * 判断错误是否可重试。
 * 可重试的错误类型包括：rate_limit、timeout、network、server。
 * @param error - 待检查的错误
 * @returns 如果错误可重试返回 true
 */
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

/**
 * 将各种错误类型标准化为 LLMError。
 * 处理 LLMError 实例、AbortError、网络错误和其他未知错误。
 * @param error - 原始错误
 * @param provider - 提供者名称（可选）
 * @returns 标准化的 LLMError 实例
 */
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
      // Distinguish network errors from code bugs
      // fetch API network errors typically contain specific messages
      const networkErrorPatterns = ['fetch', 'network', 'failed to fetch', 'enotfound', 'econnrefused'];
      const isNetworkError = networkErrorPatterns.some(pattern =>
        error.message.toLowerCase().includes(pattern)
      );
      return new LLMError(error.message || 'LLM error', {
        kind: isNetworkError ? 'network' : 'unknown',
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
