import 'server-only';

// core/llm/providers/mock.ts
import { LLMProvider } from '../types';
import { Message } from '@/core/types/type';

type LLMRawResponse = {
  content: string;
  meta: { id?: string; created?: number; model?: string };
};

export class MockProvider implements LLMProvider {
  async call(prompt: Message[]): Promise<LLMRawResponse> {
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
        model: 'mock-model'
      }
    };
  }
}
