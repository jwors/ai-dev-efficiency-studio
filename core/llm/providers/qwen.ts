import 'server-only';
import { LLMProvider } from '../types';
import { Message } from '@/core/types/type';

type LLMRawResponse = {
	content: string;
	meta: { id?: string; created?: number; model?: string };
  };

interface QwenApiResponse {
	id?: string;
	created?: number;
	model?: string;
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
	error?: {
		message?: string;
		code?: string;
	};
}

export class QwenProvider implements LLMProvider {
	constructor(
		private apiKey: string,
		private model = 'qwen-plus'
	) { }

	async call(prompt: Message[]): Promise<LLMRawResponse> {
		const res = await fetch(
			'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
			{
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: this.model,
					messages: prompt,
					temperature: 0
				})
			}
		);

		if (!res.ok) {
			const errorData = await res.json() as QwenApiResponse;
			throw new Error(
				`Qwen API Error (${res.status}): ${errorData.error?.message ?? 'Unknown error'}`
			);
		}

		const data = await res.json() as QwenApiResponse;

		const content = data.choices?.[0]?.message?.content ?? '';
		return {
		  content,
		  meta: {
			id: data.id,
			created: data.created,
			model: data.model,
		  },
		};
	}
}
