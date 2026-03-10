import type { Message } from '@/core/types';

/**
 * 估算文本的 token 数量。
 * 非 ASCII 字符（如中文）计为 1 token，ASCII 字符计为 0.25 token。
 * @param text - 待估算的文本
 * @returns 估算的 token 数量
 */
function estimateTokens(text: string) {
  let tokens = 0;
  for (const ch of text) {
    // 非 ASCII（大概率是中文/全角符号）
    tokens += ch.charCodeAt(0) > 127 ? 1 : 0.25;
  }
  return Math.ceil(tokens);
}

/**
 * 估算消息数组的总 token 数量。
 * 每条消息额外计算 12 token 的开销。
 * @param messages - 消息数组
 * @returns 总 token 数量
 */
export function estimateMessagesTokens(messages: Message[]) {
  let t = 0;
  for (const m of messages) {
    t += 12; // overhead
    t += estimateTokens(String(m.content ?? ""));
  }
  return t;
}

/**
 * 将消息数组裁剪到指定 token 预算内。
 * 优先删除最早的非 system 消息，保留 system 消息。
 * @param messages - 原始消息数组
 * @param budgetTokens - token 预算上限
 * @returns 裁剪后的消息数组
 */
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
