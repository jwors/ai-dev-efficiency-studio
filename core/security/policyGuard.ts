import type { Task } from '../task/types';

interface HttpTaskParams {
  url?: unknown;
}

interface SearchTaskParams {
  query?: unknown;
}

const DEV_AUTO_ALLOW = process.env.NODE_ENV !== 'production';
const dynamicAllowlist = new Set<string>();

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

function normalizeHost(host: string) {
    return host.toLowerCase().replace(/^www\./, '');
}

function isAllowedHost(host: string) {
    const h = normalizeHost(host);
    if (dynamicAllowlist.has(h)) return true;
    return ALLOWLIST.some((d) => h === d || h.endsWith(`.${d}`));
}

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

    if (!isAllowedHost(u.hostname)) {
        const h = normalizeHost(u.hostname);
        if (DEV_AUTO_ALLOW) {
          dynamicAllowlist.add(h);
          console.warn(`[policy] auto-allow domain (dev): ${h}`);
          return;
        }
        throw new PolicyError("DOMAIN_NOT_ALLOWED", `域名不在白名单: ${u.hostname}`);
    }
}

export function policyGuard(task: Task) {
    switch (task.type) {
        case 'http': {
            const params = task.params as HttpTaskParams;
            const url = String(params.url ?? '');
            if (!url) throw new PolicyError("MISSING_URL", "http task 缺少 url 参数。")
            guardHttpUrl(url);
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
            guardHttpUrl(url);
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