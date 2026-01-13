import 'server-only';
import { LLMProvider } from '../types';
import { Message  } from '@/core/types/type';

type LLMRawResponse = {
	content: string;
	meta: { id?: string; created?: number; model?: string };
  };

export class QwenProvide implements LLMProvider { 
	constructor(
		private apiKey: string,
		private model = 'qwen-plus'
	) { }

	async call(prompt: Message[]):Promise<LLMRawResponse> { 
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
		console.log(res)
		if (!res.ok) { 
			const errorData = await res.json();
			throw new Error(`API Error: ${errorData.message}`);
		}
		const data: any = await res.json();

		const content = String(data?.choices?.[0]?.message?.content ?? ""); // ✅ 强制 string
	  
		return {
		  content,
		  meta: {
			id: typeof data?.id === "string" ? data.id : undefined,
			created: typeof data?.created === "number" ? data.created : undefined,
			model: typeof data?.model === "string" ? data.model : undefined,
		  },
		};
	}
}
