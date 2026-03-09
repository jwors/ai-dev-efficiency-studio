import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withFallback, CircuitBreakerPolicy, resetProviderHealth } from './fallback';
import { LLMError } from './error';
import type { LLMProvider } from './types';

const createMockProvider = (name: string): LLMProvider => ({
  name,
  call: vi.fn(),
});

const defaultPolicy: CircuitBreakerPolicy = {
  failureThreshold: 3,
  openMs: 1000, // Short for tests
};

describe('withFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetProviderHealth();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should return result from first successful provider', async () => {
    const provider1 = createMockProvider('provider1');
    const provider2 = createMockProvider('provider2');

    const execute = vi.fn().mockResolvedValue('success');

    const result = await withFallback([provider1, provider2], execute, defaultPolicy);

    expect(result).toBe('success');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(provider1);
  });

  it('should fallback to second provider on first failure', async () => {
    const provider1 = createMockProvider('fallback-test-p1');
    const provider2 = createMockProvider('fallback-test-p2');

    const error = new LLMError('failed', { kind: 'server' });
    const execute = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await withFallback([provider1, provider2], execute, defaultPolicy);

    expect(result).toBe('success');
    expect(execute).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('fallback from fallback-test-p1 to fallback-test-p2'),
    );

    consoleSpy.mockRestore();
  });

  it('should throw when all providers fail', async () => {
    const provider1 = createMockProvider('all-fail-p1');
    const provider2 = createMockProvider('all-fail-p2');

    const error = new LLMError('failed', { kind: 'server' });
    const execute = vi.fn().mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      withFallback([provider1, provider2], execute, defaultPolicy),
    ).rejects.toThrow('All LLM providers failed');

    expect(execute).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it('should throw when no providers configured', async () => {
    const execute = vi.fn();

    await expect(withFallback([], execute, defaultPolicy)).rejects.toThrow(
      'No LLM provider configured',
    );

    expect(execute).not.toHaveBeenCalled();
  });

  it('should open circuit after reaching failure threshold', async () => {
    const provider = createMockProvider('circuit-open-test');
    const error = new LLMError('failed', { kind: 'server' });

    let callCount = 0;
    const execute = vi.fn().mockImplementation(() => {
      callCount++;
      throw error;
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Fail 3 times to open circuit (failureThreshold: 3)
    await expect(
      withFallback([provider], execute, {
        failureThreshold: 3,
        openMs: 1000,
      }),
    ).rejects.toThrow();
    expect(callCount).toBe(1);

    await expect(
      withFallback([provider], execute, {
        failureThreshold: 3,
        openMs: 1000,
      }),
    ).rejects.toThrow();
    expect(callCount).toBe(2);

    await expect(
      withFallback([provider], execute, {
        failureThreshold: 3,
        openMs: 1000,
      }),
    ).rejects.toThrow();
    expect(callCount).toBe(3);

    // Now circuit should be open, no actual call
    await expect(
      withFallback([provider], execute, {
        failureThreshold: 3,
        openMs: 1000,
      }),
    ).rejects.toThrow('circuit open');

    expect(callCount).toBe(3); // Should not increase

    consoleSpy.mockRestore();
  });

  it('should close circuit after openMs elapsed', async () => {
    const provider = createMockProvider('circuit-close-test');
    const error = new LLMError('failed', { kind: 'server' });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const policy: CircuitBreakerPolicy = {
      failureThreshold: 2,
      openMs: 100,
    };

    // Create a sequence of results
    const results: (string | Error)[] = [
      error, error, 'success'
    ];
    let resultIndex = 0;

    const execute = vi.fn().mockImplementation(() => {
      const result = results[resultIndex++];
      if (result instanceof Error) {
        throw result;
      }
      return result;
    });

    // Get initial time
    const startTime = Date.now();

    // Fail 2 times to open circuit (failureThreshold: 2)
    await expect(withFallback([provider], execute, policy)).rejects.toThrow();
    await expect(withFallback([provider], execute, policy)).rejects.toThrow();

    // Circuit is open - advance time past openMs
    vi.setSystemTime(startTime + 150);

    // Should succeed now (circuit closed)
    const result = await withFallback([provider], execute, policy);
    expect(result).toBe('success');

    consoleSpy.mockRestore();
  });

  it('should reset failure count on success', async () => {
    const provider = createMockProvider('reset-count-test');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const policy: CircuitBreakerPolicy = {
      failureThreshold: 3,
      openMs: 1000,
    };

    // Create a sequence of results
    const results: (string | Error)[] = [
      new LLMError('fail1', { kind: 'server' }),
      new LLMError('fail2', { kind: 'server' }),
      'success1',
      new LLMError('fail3', { kind: 'server' }),
      new LLMError('fail4', { kind: 'server' }),
      'success2'
    ];
    let resultIndex = 0;

    const execute = vi.fn().mockImplementation(() => {
      const result = results[resultIndex++];
      if (result instanceof Error) {
        throw result;
      }
      return result;
    });

    // Fail twice, then succeed (failure count reset)
    await expect(withFallback([provider], execute, policy)).rejects.toThrow();
    await expect(withFallback([provider], execute, policy)).rejects.toThrow();
    const result1 = await withFallback([provider], execute, policy);
    expect(result1).toBe('success1');

    // Fail twice more - should not open circuit yet (need 3 consecutive failures)
    await expect(withFallback([provider], execute, policy)).rejects.toThrow();
    await expect(withFallback([provider], execute, policy)).rejects.toThrow();

    // Success again - failure count should reset
    const result2 = await withFallback([provider], execute, policy);
    expect(result2).toBe('success2');

    consoleSpy.mockRestore();
  });

  it('should handle multiple providers with circuit breaker', async () => {
    const provider1 = createMockProvider('multi-p1');
    const provider2 = createMockProvider('multi-p2');

    const execute = vi
      .fn()
      .mockRejectedValueOnce(new LLMError('fail', { kind: 'server' }))
      .mockResolvedValueOnce('success');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await withFallback([provider1, provider2], execute, defaultPolicy);

    expect(result).toBe('success');

    consoleSpy.mockRestore();
  });

  it('should throw all circuits open error when all providers have open circuits', async () => {
    const provider1 = createMockProvider('all-open-p1');
    const provider2 = createMockProvider('all-open-p2');

    const error = new LLMError('fail', { kind: 'server' });
    const execute = vi.fn().mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const policy: CircuitBreakerPolicy = {
      failureThreshold: 2,
      openMs: 10000,
    };

    // Open circuits for both providers
    await expect(withFallback([provider1, provider2], execute, policy)).rejects.toThrow();
    await expect(withFallback([provider1, provider2], execute, policy)).rejects.toThrow();
    await expect(withFallback([provider1, provider2], execute, policy)).rejects.toThrow();
    await expect(withFallback([provider1, provider2], execute, policy)).rejects.toThrow();

    // Now both circuits should be open
    await expect(withFallback([provider1, provider2], execute, policy)).rejects.toThrow(
      'All LLM providers are temporarily unavailable',
    );

    consoleSpy.mockRestore();
  });

  it('should normalize errors from providers', async () => {
    const provider = createMockProvider('normalize-test');
    const genericError = new Error('something went wrong');

    const execute = vi.fn().mockRejectedValue(genericError);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(withFallback([provider], execute, defaultPolicy)).rejects.toThrow(
      LLMError,
    );

    consoleSpy.mockRestore();
  });
});