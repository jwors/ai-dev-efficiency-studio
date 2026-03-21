import type { Message } from '@/core/types';

const BLOCKED_HISTORY_PATTERNS = [
  /127\.0\.0\.1/i,
  /localhost/i,
  /\b0\.0\.0\.0\b/i,
  /http:\/\/+/i,
  /Authorization:\s*Bearer/i,
  /只允许\s*https/i,
];

const REFUSAL_PATTERNS = [
  /安全限制/i,
  /违法行为/i,
  /非法访问/i,
  /网络安全法/i,
  /中华人民共和国刑法/i,
  /我不能、也不会提供任何攻击/i,
  /我不能协助.*(攻击|入侵|渗透|绕过|窃取|恶意软件)/i,
  /⚠️\s*安全限制/i,
];

const RISKY_HISTORY_PATTERNS = [
  /如何入侵/i,
  /攻击|入侵|渗透|hack|ddos|dos 攻击/i,
  /绕过|破解|bypass|突破/i,
  /提权|后门|免杀|漏洞利用/i,
  /钓鱼|木马|勒索软件|keylogger|trojan|backdoor/i,
  /窃取|盗取|导出.*(数据库|凭证|token|密码|cookie)/i,
];

/**
 * 检查文本是否匹配任意正则模式。
 * @param text - 待检查的文本
 * @param patterns - 正则模式数组
 * @returns 如果匹配任意模式返回 true
 */
function matchesAny(text: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * 判断文本是否为拒绝类响应。
 * 检测文本中是否包含安全限制相关的拒绝模式。
 * @param text - 待检查的文本
 * @returns 如果是拒绝类文本返回 true
 */
export function isRefusalLikeText(text: string) {
  const content = String(text ?? '').trim();
  if (!content) return false;
  return matchesAny(content, REFUSAL_PATTERNS);
}

/**
 * 判断历史文本是否包含高风险内容。
 * 检测文本中是否包含攻击、入侵、渗透等敏感模式。
 * @param text - 待检查的历史文本
 * @returns 如果包含高风险内容返回 true
 */
function isRiskyHistoryText(text: string) {
  const content = String(text ?? '').trim();
  if (!content) return false;
  return matchesAny(content, RISKY_HISTORY_PATTERNS);
}

/**
 * 清理规划器上下文文本。
 * 移除拒绝类内容和高风险内容，返回安全的文本。
 * @param text - 原始文本
 * @returns 清理后的安全文本
 */
export function sanitizePlannerContextText(text: string) {
  const content = String(text ?? '').trim();
  if (!content) return '';
  if (isRefusalLikeText(content) || isRiskyHistoryText(content)) return '';

  const safeLines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() && !isRefusalLikeText(line) && !isRiskyHistoryText(line));

  return safeLines.join('\n').trim();
}

/**
 * 清理规划器历史消息数组。
 * 过滤掉包含敏感信息、拒绝响应和高风险内容的消息。
 * @param history - 原始历史消息数组
 * @returns 清理后的安全消息数组
 */
export function sanitizeHistoryForPlanner(history: Message[]) {
  return history.filter((message) => {
    if (message.role === 'system') return true;

    const content = String(message.content ?? '');
    if (matchesAny(content, BLOCKED_HISTORY_PATTERNS)) return false;
    if (isRefusalLikeText(content)) return false;
    if (isRiskyHistoryText(content)) return false;
    return true;
  });
}
