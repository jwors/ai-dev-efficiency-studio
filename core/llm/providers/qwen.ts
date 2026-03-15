import 'server-only';
import { LLMProvider, LLMProviderName, LLMCallOptions } from '../types';
import type { LLMRawResponse, Message } from '@/core/types';
import { LLMError, mapHttpStatusToKind } from '../error';
import { config } from '@/core/config';

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
	name:LLMProviderName = 'qwen';

	constructor(
		private apiKey: string,
		private model = 'qwen-plus'
	) { }

	async call(prompt: Message[], options?: LLMCallOptions): Promise<LLMRawResponse> {
		if (!this.apiKey) {
			throw new LLMError(
				`Qwen API key cannot be empty`,
				{
					kind: 'auth',
					provider: this.name,
					statusCode: 401,
					code: 'EMPTY_API_KEY',
				},
			)
		}
		const controller = new AbortController();
		const timeoutMs = options?.timeoutMs ?? config.llmTimeoutMs;
		const requestId = options?.requestId ?? crypto.randomUUID();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
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
					}),
					signal: controller.signal,
				}
			);

			if (!res.ok) {
				let errorData: QwenApiResponse | undefined;
				try {
					errorData = await res.json() as QwenApiResponse;
				} catch {
					errorData = undefined;
				}

				const retryAfter = res.headers.get('retry-after');
				const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
				const message = errorData?.error?.message ?? `HTTP ${res.status}`;
				console.error(
					`[Qwen] request failed requestId=${requestId} status=${res.status} model=${this.model} timeoutMs=${timeoutMs} message=${message}`,
				);
				throw new LLMError(
					`Qwen API Error (${res.status}): ${message}`,
					{
						kind: mapHttpStatusToKind(res.status),
						provider: this.name,
						statusCode: res.status,
						code: errorData?.error?.code,
						retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
					},
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
				provider: this.name,
			  },
			};
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				console.error(
					`[Qwen] request aborted requestId=${requestId} model=${this.model} timeoutMs=${timeoutMs} promptMessages=${prompt.length}`,
				);
			} else if (error instanceof Error) {
				console.error(
					`[Qwen] request error requestId=${requestId} model=${this.model} timeoutMs=${timeoutMs} message=${error.message}`,
				);
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
