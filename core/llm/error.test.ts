import { describe, it, expect } from 'vitest';
import {
  LLMError,
  mapHttpStatusToKind,
  isRetryableError,
  normalizeLLMError,
} from './error';

describe('LLMError', () => {
  it('should create an LLMError with all properties', () => {
    const cause = new Error('original error');
    const error = new LLMError('test error', {
      kind: 'rate_limit',
      provider: 'qwen',
      statusCode: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: 1000,
      cause,
    });

    expect(error.message).toBe('test error');
    expect(error.name).toBe('LLMError');
    expect(error.kind).toBe('rate_limit');
    expect(error.provider).toBe('qwen');
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.retryAfterMs).toBe(1000);
    expect(error.cause).toBe(cause);
  });

  it('should create an LLMError with minimal properties', () => {
    const error = new LLMError('simple error', {
      kind: 'unknown',
    });

    expect(error.message).toBe('simple error');
    expect(error.kind).toBe('unknown');
    expect(error.provider).toBeUndefined();
    expect(error.statusCode).toBeUndefined();
  });

  it('should be an instance of Error', () => {
    const error = new LLMError('test', { kind: 'network' });
    expect(error).toBeInstanceOf(Error);
  });
});

describe('mapHttpStatusToKind', () => {
  it('should map 429 to rate_limit', () => {
    expect(mapHttpStatusToKind(429)).toBe('rate_limit');
  });

  it('should map 401 and 403 to auth', () => {
    expect(mapHttpStatusToKind(401)).toBe('auth');
    expect(mapHttpStatusToKind(403)).toBe('auth');
  });

  it('should map 5xx to server', () => {
    expect(mapHttpStatusToKind(500)).toBe('server');
    expect(mapHttpStatusToKind(502)).toBe('server');
    expect(mapHttpStatusToKind(503)).toBe('server');
  });

  it('should map 4xx (except 401, 403, 429) to bad_request', () => {
    expect(mapHttpStatusToKind(400)).toBe('bad_request');
    expect(mapHttpStatusToKind(404)).toBe('bad_request');
    expect(mapHttpStatusToKind(422)).toBe('bad_request');
  });

  it('should map other status codes to unknown', () => {
    expect(mapHttpStatusToKind(200)).toBe('unknown');
    expect(mapHttpStatusToKind(301)).toBe('unknown');
    expect(mapHttpStatusToKind(100)).toBe('unknown');
  });
});

describe('isRetryableError', () => {
  it('should return true for retryable error kinds', () => {
    const rateLimitError = new LLMError('rate limit', { kind: 'rate_limit' });
    const timeoutError = new LLMError('timeout', { kind: 'timeout' });
    const networkError = new LLMError('network', { kind: 'network' });
    const serverError = new LLMError('server', { kind: 'server' });

    expect(isRetryableError(rateLimitError)).toBe(true);
    expect(isRetryableError(timeoutError)).toBe(true);
    expect(isRetryableError(networkError)).toBe(true);
    expect(isRetryableError(serverError)).toBe(true);
  });

  it('should return false for non-retryable error kinds', () => {
    const authError = new LLMError('auth', { kind: 'auth' });
    const badRequestError = new LLMError('bad request', { kind: 'bad_request' });
    const unknownError = new LLMError('unknown', { kind: 'unknown' });

    expect(isRetryableError(authError)).toBe(false);
    expect(isRetryableError(badRequestError)).toBe(false);
    expect(isRetryableError(unknownError)).toBe(false);
  });

  it('should return false for non-LLMError instances', () => {
    const regularError = new Error('regular error');
    expect(isRetryableError(regularError)).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
    expect(isRetryableError('string')).toBe(false);
  });
});

describe('normalizeLLMError', () => {
  it('should return LLMError as-is if it already has a provider', () => {
    const error = new LLMError('test', { kind: 'network', provider: 'qwen' });
    const result = normalizeLLMError(error, 'mock');
    expect(result).toBe(error);
    expect(result.provider).toBe('qwen');
  });

  it('should add provider to LLMError if it does not have one', () => {
    const error = new LLMError('test', { kind: 'network' });
    const result = normalizeLLMError(error, 'qwen');
    expect(result).toBe(error);
    expect(result.provider).toBe('qwen');
  });

  it('should not modify error if no provider is given', () => {
    const error = new LLMError('test', { kind: 'network' });
    const result = normalizeLLMError(error);
    expect(result.provider).toBeUndefined();
  });

  it('should convert AbortError to timeout LLMError', () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    const result = normalizeLLMError(abortError, 'qwen');

    expect(result).toBeInstanceOf(LLMError);
    expect(result.kind).toBe('timeout');
    expect(result.provider).toBe('qwen');
    expect(result.cause).toBe(abortError);
  });

  it('should convert network TypeError to network LLMError', () => {
    const typeError = new TypeError('fetch failed');
    const result = normalizeLLMError(typeError, 'qwen');

    expect(result).toBeInstanceOf(LLMError);
    expect(result.kind).toBe('network');
    expect(result.provider).toBe('qwen');
    expect(result.cause).toBe(typeError);
  });

  it('should convert TypeError with network patterns to network LLMError', () => {
    const patterns = [
      'Failed to fetch',
      'Network error',
      'ENOTFOUND',
      'ECONNREFUSED',
    ];

    patterns.forEach(message => {
      const typeError = new TypeError(message);
      const result = normalizeLLMError(typeError, 'qwen');

      expect(result.kind).toBe('network');
    });
  });

  it('should convert non-network TypeError to unknown LLMError', () => {
    const typeError = new TypeError("Cannot read property 'x' of undefined");
    const result = normalizeLLMError(typeError, 'qwen');

    expect(result).toBeInstanceOf(LLMError);
    expect(result.kind).toBe('unknown');
    expect(result.provider).toBe('qwen');
    expect(result.cause).toBe(typeError);
  });

  it('should convert generic Error to unknown LLMError', () => {
    const genericError = new Error('something went wrong');
    const result = normalizeLLMError(genericError, 'qwen');

    expect(result).toBeInstanceOf(LLMError);
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('something went wrong');
    expect(result.cause).toBe(genericError);
  });

  it('should handle non-Error values', () => {
    const result1 = normalizeLLMError('string error', 'qwen');
    expect(result1).toBeInstanceOf(LLMError);
    expect(result1.kind).toBe('unknown');
    expect(result1.message).toBe('Unknown LLM error');

    const result2 = normalizeLLMError(null, 'qwen');
    expect(result2).toBeInstanceOf(LLMError);
    expect(result2.kind).toBe('unknown');

    const result3 = normalizeLLMError({ foo: 'bar' }, 'qwen');
    expect(result3).toBeInstanceOf(LLMError);
    expect(result3.kind).toBe('unknown');
  });
});