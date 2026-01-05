import 'server-only';
import { isJson } from '@/utils';
import { LLMProvider } from '../types';

export class QwenProvide implements LLMProvider { 
	constructor(
		private apiKey: string,
		private model = 'qwen-plus'
	) { }

	async call(prompt: string): Promise<string> { 
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
					messages: [
						{
							role: 'user',
							content:prompt
						}
					],
						temperature: 0
				})
			}
		);
		if (!res.ok) { 
			const errorData = await res.json();
			throw new Error(`API Error: ${errorData.message}`);
		}

		const data = await res.json();
		const content = data.choices[0].message.content;
		
		// 判断是不是json
		if (isJson(content)) {
			return content;
		}
		
		// 如果不是 JSON，返回原始内容
		return content;
	}
}