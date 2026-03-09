import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, RetryPolicy, RetryContext } from './retry';
import { LLMError } from './error';

const defaultPolicy: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 10, // Use small values for faster tests
  maxDelayMs: 100,
  jitterRatio: 0.1,
};

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first success', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation, defaultPolicy);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const retryableError = new LLMError('rate limit', { kind: 'rate_limit' });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('success');

    const resultPromise = withRetry(operation, defaultPolicy);

    // Fast-forward through delays
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const nonRetryableError = new LLMError('bad request', { kind: 'bad_request' });
    const operation = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(withRetry(operation, defaultPolicy)).rejects.toThrow(LLMError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries exceeded', async () => {
    const retryableError = new LLMError('server error', { kind: 'server' });
    const operation = vi.fn().mockRejectedValue(retryableError);

    // Start the operation and catch the promise to avoid unhandled rejection
    const resultPromise = withRetry(operation, defaultPolicy).catch(e => e);

    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toBeInstanceOf(LLMError);
    expect(result.message).toBe('server error');
    expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('should call onRetry callback with correct context', async () => {
    const retryableError = new LLMError('timeout', { kind: 'timeout' });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('success');

    const onRetry = vi.fn();
    const resultPromise = withRetry(operation, defaultPolicy, onRetry);

    await vi.runAllTimersAsync();

    await resultPromise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    const context: RetryContext = onRetry.mock.calls[0][0];
    expect(context.attempt).toBe(1);
    expect(context.maxRetries).toBe(3);
    expect(context.error).toBeInstanceOf(LLMError);
    expect(context.nextDelayMs).toBeGreaterThanOrEqual(0);
  });

  it('should respect retryAfterMs from error', async () => {
    const retryableError = new LLMError('rate limit', {
      kind: 'rate_limit',
      retryAfterMs: 50,
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('success');

    const onRetry = vi.fn();
    const resultPromise = withRetry(operation, defaultPolicy, onRetry);

    await vi.runAllTimersAsync();

    await resultPromise;

    const context: RetryContext = onRetry.mock.calls[0][0];
    expect(context.nextDelayMs).toBe(50);
  });

  it('should cap retryAfterMs to maxDelayMs', async () => {
    const retryableError = new LLMError('rate limit', {
      kind: 'rate_limit',
      retryAfterMs: 1000, // Larger than maxDelayMs (100)
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('success');

    const onRetry = vi.fn();
    const resultPromise = withRetry(operation, defaultPolicy, onRetry);

    await vi.runAllTimersAsync();

    await resultPromise;

    const context: RetryContext = onRetry.mock.calls[0][0];
    expect(context.nextDelayMs).toBe(100); // Capped to maxDelayMs
  });

  it('should use exponential backoff', async () => {
    const retryableError = new LLMError('server error', { kind: 'server' });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValue(retryableError);

    const delays: number[] = [];
    const onRetry = (context: RetryContext) => delays.push(context.nextDelayMs);

    // Catch to avoid unhandled rejection
    const resultPromise = withRetry(operation, defaultPolicy, onRetry).catch(e => e);
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toBeInstanceOf(LLMError);

    // Verify delays are increasing (with jitter, so check base values)
    expect(delays.length).toBe(3);
    // baseDelayMs * 2^attempt with jitter
    // attempt 0: ~10ms, attempt 1: ~20ms, attempt 2: ~40ms
    expect(delays[1]).toBeGreaterThan(delays[0] * 0.5);
    expect(delays[2]).toBeGreaterThan(delays[1] * 0.5);
  });

  it('should handle zero maxRetries', async () => {
    const noRetryPolicy: RetryPolicy = {
      maxRetries: 0,
      baseDelayMs: 10,
      maxDelayMs: 100,
      jitterRatio: 0.1,
    };
    const retryableError = new LLMError('server error', { kind: 'server' });
    const operation = vi.fn().mockRejectedValue(retryableError);

    await expect(withRetry(operation, noRetryPolicy)).rejects.toThrow('server error');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should normalize non-LLMError errors', async () => {
    const genericError = new Error('network failed');
    const operation = vi.fn().mockRejectedValue(genericError);

    await expect(withRetry(operation, defaultPolicy)).rejects.toThrow('network failed');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});