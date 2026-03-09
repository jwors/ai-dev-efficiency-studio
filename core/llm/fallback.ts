import 'server-only';
import type { LLMProvider } from './types';
import { LLMError, normalizeLLMError } from './error';

// Circuit breaker config for each provider.
export interface CircuitBreakerPolicy {
  failureThreshold: number;
  openMs: number;
}

// In-memory health state for one provider.
type ProviderHealth = {
  consecutiveFailures: number;
  openUntil: number;
};

const providerHealth = new Map<string, ProviderHealth>();

/**
 * Get or initialize provider health state.
 */
function getHealth(name: string): ProviderHealth {
  const current = providerHealth.get(name);
  if (current) return current;

  // Initialize as healthy.
  const initial = { consecutiveFailures: 0, openUntil: 0 };
  providerHealth.set(name, initial);
  return initial;
}

/**
 * Check whether provider circuit is currently open.
 */
function isCircuitOpen(name: string, now: number): boolean {
  const health = getHealth(name);
  return health.openUntil > now;
}

/**
 * Mark one successful call and reset failure counters.
 */
function markSuccess(name: string): void {
  const health = getHealth(name);
  health.consecutiveFailures = 0;
  health.openUntil = 0;
}

/**
 * Mark one failed call and open circuit if threshold is reached.
 */
function markFailure(
  name: string,
  now: number,
  policy: CircuitBreakerPolicy,
): void {
  const health = getHealth(name);
  health.consecutiveFailures += 1;
  if (health.consecutiveFailures >= policy.failureThreshold) {
    health.openUntil = now + policy.openMs;
    health.consecutiveFailures = 0;
  }
}

/**
 * Execute against providers in order with circuit-breaker-aware fallback.
 * Return on first success; otherwise throw a normalized aggregate error.
 */
export async function withFallback<T>(
  providers: LLMProvider[],
  execute: (provider: LLMProvider) => Promise<T>,
  policy: CircuitBreakerPolicy,
): Promise<T> {
  if (providers.length === 0) {
    throw new LLMError('No LLM provider configured', {
      kind: 'unknown',
    });
  }

  const errors: string[] = [];
  let skippedByCircuit = 0;
  let lastError: Error | undefined;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const now = Date.now();
    if (isCircuitOpen(provider.name, now)) {
      skippedByCircuit += 1;
      errors.push(`${provider.name}: circuit open`);
      continue;
    }

    try {
      const value = await execute(provider);
      markSuccess(provider.name);
      return value;
    } catch (error) {
      const normalized = normalizeLLMError(error, provider.name);
      markFailure(provider.name, Date.now(), policy);
      lastError = normalized;
      errors.push(`${provider.name}: ${normalized.message}`);
      if (i < providers.length - 1) {
        console.warn(
          `[LLM] fallback from ${provider.name} to ${providers[i + 1].name}: ${normalized.message}`,
        );
      }
    }
  }

  if (skippedByCircuit === providers.length) {
    throw new LLMError('All LLM providers are temporarily unavailable (circuit open)', {
      kind: 'server',
    });
  }

  throw new LLMError(
    `All LLM providers failed: ${errors.join(' | ')}`,
    {
      kind: 'unknown',
      cause: lastError,
    },
  );
}
