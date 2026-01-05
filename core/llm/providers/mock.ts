import 'server-only';

// core/llm/providers/mock.ts
import { LLMProvider } from '../types';

export class MockProvider implements LLMProvider {
  async call(prompt: string): Promise<string> {
    return JSON.stringify({
      goal: 'mock goal',
      steps: [
        {
          action: 'log',
          params: { message: 'hello from mock llm' }
        }
      ]
    });
  }
}
