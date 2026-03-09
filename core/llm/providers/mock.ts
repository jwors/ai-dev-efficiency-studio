import 'server-only';

// core/llm/providers/mock.ts
import { LLMProvider, LLMProviderName } from '../types';
import type { LLMRawResponse, Message } from '@/core/types';

export class MockProvider implements LLMProvider {
  name:LLMProviderName = 'mock';

  async call(_prompt: Message[]): Promise<LLMRawResponse> {
    const content = JSON.stringify({
      goal: 'mock goal',
      steps: [
        {
          action: 'log',
          params: { message: 'hello from mock llm' }
        }
      ]
    });

    return {
      content,
      meta: {
        id: 'mock-id',
        created: Date.now(),
        model: 'mock-model',
        provider: this.name,
      }
    };
  }
}
