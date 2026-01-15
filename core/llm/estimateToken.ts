import { Message } from '../types/type'

function estimateTokens(text: string) {
  let tokens = 0;
  for (const ch of text) {
    // 非 ASCII（大概率是中文/全角符号）
    tokens += ch.charCodeAt(0) > 127 ? 1 : 0.25;
  }
  return Math.ceil(tokens);
}


export function estimateMessagesTokens(messages: Message[]) {
  let t = 0;
  for (const m of messages) {
    t += 12; // overhead
    t += estimateTokens(String(m.content ?? ""));
  }
  return t;
}


export function clampMessagesToBudget(messages: Message[], budgetTokens: number) {
  const out = [...messages];

  while (estimateMessagesTokens(out) > budgetTokens) {
    // 找到最早的一条“非 system”消息删掉
    const idx = out.findIndex(m => m.role !== "system");
    if (idx === -1) break; // 只有 system 了，别删了
    out.splice(idx, 1);
  }

  return out;
}
