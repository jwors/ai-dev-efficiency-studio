import type { Task } from '../task/types';

export class PolicyError extends Error {
    code: string;
    constructor(code: string, message: string) { 
        super(message);
        this.code = code;
    }
}

function isPrivateHostname(host: string) {
    const h = host.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";
}

function isPrivateIP(ip: string) {
      // 只做最常见私网段判断（MVP 够用）
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;
  // 172.16.0.0 - 172.31.255.255
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

function guardHttpUrl(urlStr: string) {
    let u: URL;
    try {
        u = new URL(urlStr);
    } catch {
        throw new PolicyError("BAD_URL", `非法 URL: ${urlStr}`);
    }
  
    if (u.protocol !== "https:") {
        throw new PolicyError("ONLY_HTTPS", "只允许 https 请求。");
    }
  
    if (isPrivateHostname(u.hostname)) {
        throw new PolicyError("NO_LOCALHOST", "禁止访问 localhost/本机地址。");
    }
  
    // 如果 hostname 直接是 IP，再做私网段拦截
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname)) {
        if (isPrivateIP(u.hostname)) {
            throw new PolicyError("NO_PRIVATE_IP", "禁止访问内网 IP 段。");
        }
    }
}

export function policyGuard(task: Task) {
    switch (task.type) {
        case 'http': {
            const url = String((task as any).params?.url ?? "")
            if (!url) throw new PolicyError("MISSING_URL", "http task 缺少 url 参数。")
            guardHttpUrl(url);
            return
        }
        case 'log':
        case 'emit':
        case 'export_flow':
            return;
        
        default:
            throw new PolicyError("UNKNOWN_TASK", `未知 task: ${(task as any).type}`)
    }
}