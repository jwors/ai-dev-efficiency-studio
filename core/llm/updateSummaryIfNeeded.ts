import type { SessionState, Message } from '@/core/types';
const MAX_HISTORY =12;

/**
 * 在需要时更新会话摘要。
 * 当历史消息超过 MAX_HISTORY 时，将溢出的消息压缩为摘要。
 * @param state - 会话状态
 * @param callLLM - LLM 调用函数，用于生成摘要
 */
export async function updateSummaryIfNeeded(
  state: SessionState,
  callLLM: (messages: Message[]) => Promise<string>
) {
  if (state.history.length <= MAX_HISTORY) return;

  const overflow = state.history.slice(0, state.history.length - MAX_HISTORY);
   // 取出大于最大历史的
  const keep = state.history.slice(-MAX_HISTORY);

  const messages: Message[] = [
		{
			role: 'system',
			content:`“你是一名摘要员。”
				“将对话内容概括成简洁的会话记忆片段。”
				“字数控制在 300 字以内。仅使用纯文本。”
				“重点：目标、决策、限制条件、关键成果。”`
		},
    { role: "user", content: `NEW_MESSAGES:\n${JSON.stringify(overflow)}` },
	];
	if (state.summary) { 
		messages.push({ role: "system", content: `OLD_SUMMARY:\n${state.summary}` })
	}

  // 这里的调用llm 为的是压缩历史，时间维度是过去的
  /*
	把“已经发生过的事情”压缩成更小的表示
	不做决策，不产出 Plan，不关心下一步要干嘛
  */
  const newSummary = (await callLLM(messages)).trim();

  state.summary = newSummary;
  // 相当于摘要
  state.history = keep;
  // history 最近的对话

}
