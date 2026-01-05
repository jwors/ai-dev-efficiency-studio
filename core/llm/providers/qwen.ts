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
					input: {
						prompt
					},
					parameters: {
						temperature: 0
					}
				})
			}
		);
		if (!res.ok) { 
			console.log(res.status)
			throw new Error(`Qwen API error: ${res.status}`);
		}
		const data = await res.json();

    // 只返回文本
    return data.output.text;
	}
}