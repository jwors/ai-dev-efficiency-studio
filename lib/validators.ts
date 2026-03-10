/**
 * 验证字符串是否为有效的电子邮件格式。
 * @param value - 待验证的字符串
 * @returns 如果是有效邮箱返回 true
 */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
