import type { Task } from '../task/types';

interface HttpTaskParams {
  url?: unknown;
}

interface SearchTaskParams {
  query?: unknown;
}

// 会话级别的动态白名单（每次执行重置）
export interface PolicyContext {
  dynamicAllowlist: Set<string>;
}

/**
 * 创建新的策略上下文。
 * @returns 初始化的策略上下文对象
 */
export function createPolicyContext(): PolicyContext {
  return {
    dynamicAllowlist: new Set<string>(),
  };
}

const DEV_AUTO_ALLOW = process.env.NODE_ENV !== 'production';

// 允许访问的白名单
const ALLOWLIST = [
    "semi.org",
    "mckinsey.com",
    "bcg.com",
    "bain.com",
    "gartner.com",
    "forrester.com",
    "oecd.org",
    "worldbank.org",
    "weforum.org",
    "imf.org",
    "statista.com",
    "ourworldindata.org",
    "stats.gov.cn",
    "mof.gov.cn",
    "pbc.gov.cn",
    "caict.ac.cn",
    "duckduckgo.com", // 搜索入口，可删
];

/**
 * 标准化主机名（转小写并移除 www 前缀）。
 * @param host - 原始主机名
 * @returns 标准化后的主机名
 */
function normalizeHost(host: string) {
    return host.toLowerCase().replace(/^www\./, '');
}

/**
 * 检查主机名是否在允许列表或动态白名单中。
 * @param host - 主机名
 * @param context - 策略上下文
 * @returns 如果允许访问返回 true
 */
function isAllowedHost(host: string, context: PolicyContext) {
    const h = normalizeHost(host);
    if (context.dynamicAllowlist.has(h)) return true;
    return ALLOWLIST.some((d) => h === d || h.endsWith(`.${d}`));
}

export class PolicyError extends Error {
    code: string;
    /**
     * 创建策略错误实例。
     * @param code - 错误代码
     * @param message - 错误消息
     */
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
    }
}

/**
 * 检查主机名是否为本地地址（localhost/127.0.0.1/0.0.0.0）。
 * @param host - 主机名
 * @returns 如果是本地地址返回 true
 */
function isPrivateHostname(host: string) {
    const h = host.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";
}

/**
 * 检查 IP 是否为私有地址段（10.x/8, 192.168.x/16, 172.16-31.x/12）。
 * @param ip - IP 地址字符串
 * @returns 如果是私有 IP 返回 true
 */
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

/**
 * 检查 HTTP URL 的安全性。
 * 验证协议、主机名、IP 地址是否合规。
 * @param urlStr - URL 字符串
 * @param context - 策略上下文
 * @throws PolicyError 如果 URL 不符合安全策略
 */
function guardHttpUrl(urlStr: string, context: PolicyContext) {
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

    if (!isAllowedHost(u.hostname, context)) {
        const h = normalizeHost(u.hostname);
        if (DEV_AUTO_ALLOW) {
          context.dynamicAllowlist.add(h);
          console.warn(`[policy] auto-allow domain (dev): ${h}`);
          return;
        }
        throw new PolicyError("DOMAIN_NOT_ALLOWED", `域名不在白名单：${u.hostname}`);
    }
}

/**
 * 任务安全策略守卫。
 * 根据任务类型检查是否符合安全策略，包括 URL 白名单、内网访问限制等。
 * @param task - 待检查的任务
 * @param context - 策略上下文（包含动态白名单）
 * @throws PolicyError 如果任务违反安全策略
 */
export function policyGuard(task: Task, context: PolicyContext) {
    switch (task.type) {
        case 'http': {
            const params = task.params as HttpTaskParams;
            const url = String(params.url ?? '');
            if (!url) throw new PolicyError("MISSING_URL", "http task 缺少 url 参数。")
            guardHttpUrl(url, context);
            return
        }
        case 'web.search': {
            const params = task.params as SearchTaskParams;
            const q = String(params.query ?? '');
            if (!q) throw new PolicyError("MISSING_QUERY", "web.search 缺少 query");
            return;
        }
        case 'web.fetch': {
            const params = task.params as HttpTaskParams;
            const url = String(params.url ?? "");
            if (!url) throw new PolicyError("MISSING_URL", "web.fetch 缺少 url");
            guardHttpUrl(url, context);
            return;
        }
        case 'log':
        case 'emit':
        case 'export_flow':
        case 'file.write':
        case 'artifact.export':
            return;

        default: {
            const unknownTask = task as { type?: string };
            throw new PolicyError("UNKNOWN_TASK", `未知 task: ${unknownTask.type ?? 'unknown'}`)
        }
    }
}
