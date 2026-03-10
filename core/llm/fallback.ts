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
 * 重置所有提供者健康状态（用于测试）。
 */
export function resetProviderHealth(): void {
  providerHealth.clear();
}

/**
 * 获取或初始化提供者健康状态。
 * 如果状态不存在则创建初始健康状态。
 * @param name - 提供者名称
 * @returns 提供者健康状态对象
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
 * 检查提供者熔断器当前是否处于开启状态。
 * @param name - 提供者名称
 * @param now - 当前时间戳（毫秒）
 * @returns 如果熔断器开启返回 true
 */
function isCircuitOpen(name: string, now: number): boolean {
  const health = getHealth(name);
  return health.openUntil > now;
}

/**
 * 标记一次成功调用，重置失败计数器。
 * @param name - 提供者名称
 */
function markSuccess(name: string): void {
  const health = getHealth(name);
  health.consecutiveFailures = 0;
  health.openUntil = 0;
}

/**
 * 标记一次失败调用，当达到阈值时开启熔断器。
 * @param name - 提供者名称
 * @param now - 当前时间戳（毫秒）
 * @param policy - 熔断策略配置
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
 * 按顺序执行提供者调用，支持熔断器感知的降级策略。
 * 首次成功即返回；若全部失败则抛出标准化聚合错误。
 * @param providers - LLM 提供者列表
 * @param execute - 执行函数，接收提供者实例
 * @param policy - 熔断策略配置
 * @returns 第一个成功提供者的返回值
 * @throws 如果所有提供者都失败或熔断器全部开启
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
