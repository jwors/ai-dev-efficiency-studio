import 'server-only';
import { config } from '@/core/config';
import type { LLMProvider } from './types';
import type { LLMRawResponse, Message } from '@/core/types';
import { withRetry } from './retry';
import { withFallback } from './fallback';
import { normalizeLLMError } from './error';

let providers: LLMProvider[] = [];

// Initialize LLM providers (primary + optional fallback list).
export function initLLM(providerInstances?: LLMProvider | LLMProvider[]) {
  if (!providerInstances) return;
  providers = Array.isArray(providerInstances)
    ? providerInstances
    : [providerInstances];
}

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

export async function callLLMSummary(prompt: Message[]): Promise<string> {
  const summary = await callLLM(prompt);
  return summary.content.trim();
}
