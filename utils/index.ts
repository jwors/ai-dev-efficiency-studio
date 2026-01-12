
/**
 * 判断一个字符串是否为有效的 JSON 字符串
 * @param str 要判断的字符串
 * @returns 如果是有效的 JSON 字符串则返回 true，否则返回 false
 */

export function isJson(str: string): boolean{
	if (typeof str !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(str);
    // 确保解析结果不是 undefined（例如输入 "undefined" 会报错，但输入 "null" 是合法的）
    // JSON.parse 只能解析完整的 JSON 值（对象、数组、字符串、数字、布尔、null）
    // 所以只要不抛异常，就是合法 JSON
    return true;
  } catch (e) {
    return false;
  }
}

// 前端：拿 sessionId
export function getOrCreateSessionId() {
  const key = "agent_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    const newId = crypto.randomUUID();
    sessionStorage.setItem(key, newId);
    id = newId;
  }
  return id;
}
