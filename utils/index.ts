
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



/**
 * Cookie 写入配置项类型定义
 * 包含 maxAge/secure 等常用属性，贴合浏览器原生规范
 */
export interface CookieOptions {
  maxAge?: number; // 有效期（秒），优先级高于 expires
  path?: string; // 生效路径，默认 '/'
  domain?: string; // 生效域名
  secure?: boolean; // 仅 HTTPS 生效，生产环境建议开启
  sameSite?: 'strict' | 'lax' | 'none'; // 防 CSRF 配置
}

/**
 * 客户端读取 Cookie
 * @param key Cookie 键名
 * @returns 解码后的 Cookie 值（不存在返回 null）
 */
export const getCookie = (key: string): string | null => {
  if (typeof document === 'undefined') return null; // 兜底：防止服务端意外执行
  const cookieStr = document.cookie;
  const cookies = cookieStr.split('; ').reduce<Record<string, string>>((acc, item) => {
    const [k, v] = item.split('=');
    acc[k] = decodeURIComponent(v); // 解码特殊字符（如中文、&等）
    return acc;
  }, {});
  return cookies[key] || null;
};

/**
 * 客户端写入 Cookie
 * @param key Cookie 键名
 * @param value Cookie 键值
 * @param options 可选配置项
 */
export const setCookie = (
  key: string,
  value: string,
  options: CookieOptions = {}
): void => {
  if (typeof document === 'undefined') return; // 兜底：防止服务端意外执行
  // 编码键值，避免特殊字符导致的 Cookie 解析错误
  const encodedKey = encodeURIComponent(key);
  const encodedValue = encodeURIComponent(value);
  let cookie = `${encodedKey}=${encodedValue}`;

  // 拼接配置项，按浏览器规范处理
  if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
  if (options.path) cookie += `; path=${options.path}`;
  else cookie += `; path=/`; // 默认全站生效
  if (options.domain) cookie += `; domain=${options.domain}`;
  if (options.secure) cookie += `; secure`;
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;

  // 写入 Cookie
  document.cookie = cookie;
};

/**
 * 客户端删除 Cookie
 * @param key Cookie 键名
 * @param options 可选配置（需与写入时的 path/domain 一致，否则删除失败）
 */
export const removeCookie = (key: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void => {
  // 通过设置 maxAge=0 实现删除，需保证配置与写入时一致
  setCookie(key, '', { ...options, maxAge: 0 });
};