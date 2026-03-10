import 'server-only';
import { config } from '@/core/config';
import type { LLMProvider } from './types';
import type { LLMRawResponse, Message } from '@/core/types';
import { withRetry } from './retry';
import { withFallback } from './fallback';
import { normalizeLLMError } from './error';

let providers: LLMProvider[] = [];

/**
 * 初始化 LLM 提供者（支持主提供者和可选的备用列表）。
 * @param providerInstances - 单个提供者或提供者数组
 */
export function initLLM(providerInstances?: LLMProvider | LLMProvider[]) {
  if (!providerInstances) return;
  providers = Array.isArray(providerInstances)
    ? providerInstances
    : [providerInstances];
}

/**
 * 调用 LLM 生成响应。
 * 内部集成了重试机制和熔断降级策略。
 * @param prompt - 消息数组，包含对话历史和当前请求
 * @returns LLM 原始响应，包含内容和元数据
 * @throws 如果 LLM 未初始化或所有提供者都失败
 */
export async function callLLM(prompt: Message[]): Promise<LLMRawResponse> {
  if (!providers.length) {
    throw new Error('LLM not initialized');
  }

  const requestId = crypto.randomUUID();

  return withFallback(
    providers,
    async (provider) => {
      let attemptCount = 1;
      const result = await withRetry(
        async () => provider.call(prompt, {
          requestId,
          timeoutMs: config.llmTimeoutMs,
        }),
        {
          maxRetries: config.llmMaxRetries,
          baseDelayMs: config.llmBaseDelayMs,
          maxDelayMs: config.llmMaxDelayMs,
          jitterRatio: config.llmJitterRatio,
        },
        ({ attempt, maxRetries, nextDelayMs, error }) => {
          attemptCount = attempt + 1;
          console.warn(
            `[LLM] retry ${attempt}/${maxRetries} provider=${provider.name} wait=${nextDelayMs}ms reason=${error.message}`,
          );
        },
      );

      return {
        ...result,
        meta: {
          ...result.meta,
          provider: result.meta.provider ?? provider.name,
          attemptCount,
        },
      };
    },
    {
      failureThreshold: config.llmCircuitFailureThreshold,
      openMs: config.llmCircuitOpenMs,
    },
  ).catch((error) => {
    throw normalizeLLMError(error);
  });
}

/**
 * 调用 LLM 生成摘要文本。
 * 这是 callLLM 的便捷封装，直接返回修剪后的文本内容。
 * @param prompt - 消息数组
 * @returns 修剪后的摘要字符串
 */
export async function callLLMSummary(prompt: Message[]): Promise<string> {
  const summary = await callLLM(prompt);
  return summary.content.trim();
}
