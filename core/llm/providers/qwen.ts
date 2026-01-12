import 'server-only';
import { isJson } from '@/utils';
import { LLMProvider } from '../types';
import { Message  } from '@/core/types/type';

export class QwenProvide implements LLMProvider { 
	constructor(
		private apiKey: string,
		private model = 'qwen-plus'
	) { }

	async call(prompt: Message[]): Promise<string> { 
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
		console.log('))))))))))))))))')
		console.log(res)
		if (!res.ok) { 
			const errorData = await res.json();
			throw new Error(`API Error: ${errorData.message}`);
		}
		const data = await res.json();
		console.log(data)
		let content = data.choices[0].message.content;
		// 判断是不是json
		if (isJson(content)) {
			content = JSON.parse(content);
			content = Object.assign(content, {
				id: data.id
				, created: data.created
				, model: data.model
			})
			content = JSON.stringify(content);
			return content;
		}
		content = JSON.parse(content);
		content = Object.assign(content, {
			id: data.id
			, created: data.created
			, model: data.model
		})
		content = JSON.stringify(content);
		// 如果不是 JSON，返回原始内容
		return content;
	}
}