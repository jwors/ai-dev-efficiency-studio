import 'server-only';
import { isRetryableError, normalizeLLMError } from './error';

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export interface RetryContext {
  attempt: number;
  maxRetries: number;
  nextDelayMs: number;
  error: Error;
}

/**
 * 计算重试延迟时间，支持指数退避和抖动策略。
 * @param attempt - 当前尝试次数（从 0 开始）
 * @param policy - 重试策略配置
 * @param retryAfterMs - 服务端建议的重试等待时间（可选）
 * @returns 计算后的延迟毫秒数
 */
function computeDelay(
  attempt: number,
  policy: RetryPolicy,
  retryAfterMs?: number,
): number {
  if (typeof retryAfterMs === 'number' && retryAfterMs > 0) {
    return Math.min(retryAfterMs, policy.maxDelayMs);
  }

  const expDelay = Math.min(
    policy.baseDelayMs * 2 ** attempt,
    policy.maxDelayMs,
  );
  const jitter = expDelay * policy.jitterRatio * Math.random();
  return Math.floor(expDelay + jitter);
}

/**
 * 异步等待指定时间。
 * @param ms - 等待毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试机制的异步操作执行器。
 * 当操作失败时，根据策略自动重试，支持指数退避和抖动。
 * @param operation - 要执行的异步操作
 * @param policy - 重试策略配置
 * @param onRetry - 重试时的回调函数（可选）
 * @returns 操作的返回值
 * @throws 当重试次数耗尽或错误不可重试时抛出标准化错误
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  onRetry?: (context: RetryContext) => void,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      const normalized = normalizeLLMError(error);
      const canRetry =
        attempt < policy.maxRetries && isRetryableError(normalized);
      if (!canRetry) {
        throw normalized;
      }

      const delayMs = computeDelay(attempt, policy, normalized.retryAfterMs);
      onRetry?.({
        attempt: attempt + 1,
        maxRetries: policy.maxRetries,
        nextDelayMs: delayMs,
        error: normalized,
      });
      await sleep(delayMs);
      attempt += 1;
    }
  }
}
