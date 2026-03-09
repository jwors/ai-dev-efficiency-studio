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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
