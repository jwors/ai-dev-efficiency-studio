import type { Message } from "../types/type";

export type EmitOutput = { type: "emit"; payload: { content: string } };

const MAX_INPUT_CHARS = 8000;

// 安全关键词分类
const BANNED_PATTERNS: { pattern: RegExp; category: string }[] = [
    // 系统破坏类
    { pattern: /(\brm\s+(-rf|--force)|\bdel\s+\/f|\bformat\s+\w:)/i, category: "system_destroy" },
    { pattern: /(删除 | 清空 | 格式化).*(文件 | 目录 | 磁盘 | 数据库 | 系统)/, category: "system_destroy" },

    // 信息窃取类
    { pattern: /(窃取 | 盗取 | 偷 | 爬取).*(key|密钥|token|密码 | 凭证 | 隐私)/i, category: "data_theft" },
    { pattern: /(导出 | 获取).*(全部 | 所有).*(用户数据 | 数据库)/i, category: "data_theft" },

    // 网络攻击类
    { pattern: /(攻击 | 入侵|hack|ddos|dos 攻击 | 洪水攻击)/i, category: "cyber_attack" },
    { pattern: /(扫描 | 探测).*(漏洞 | 端口 | 弱点)/i, category: "cyber_attack" },

    // 绕过安全类
    { pattern: /(绕过 | 破解|bypass|突破).*(安全 | 鉴权 | 权限 | 登录 | 验证)/i, category: "security_bypass" },
    { pattern: /(生成 | 创建).*(假身份 | 虚假 | 伪造).*(证件 | 证书 | 签名)/i, category: "security_bypass" },

    // 恶意代码类
    { pattern: /(编写 | 生成).*(病毒 | 木马 | 蠕虫 | 勒索软件 | 挖矿)/i, category: "malware" },
    { pattern: /(创建 | 编写).*(钓鱼 | 欺诈).*(网站 | 邮件 | 短信)/i, category: "malware" },

    // 违禁内容类
    { pattern: /(赌博 | 毒品 | 武器 | 军火)/, category: "illegal_content" },
    { pattern: /(色情 | 成人).*(内容 | 图片 | 视频)/, category: "illegal_content" },
];

// 语义安全检查关键词（需要结合上下文判断）
const SUSPICIOUS_KEYWORDS = [
    // 与正常开发工作无关的危险请求
    "如何入侵",
    "怎么破解",
    "绕过验证",
    "跳过登录",
    "强制访问",
    "提权",
    "后门",
    "免杀",
];

export function inputGuard(input: string, messageHistory?: Message[]): EmitOutput | null {
    const text = String(input ?? '');

    // 空输入检查
    if (!text.trim()) {
        return {
            type: 'emit',
            payload: {
                content: '请输入你的目标/问题，我才能开始规划！'
            }
        };
    }

    // 长度检查
    if (text.length > MAX_INPUT_CHARS) {
        return {
            type: 'emit',
            payload: {
                content: `你的输入太长了（>${MAX_INPUT_CHARS} 字）。请缩短内容，或分多次提交。`
            }
        };
    }

    // 正则模式检查
    for (const { pattern, category } of BANNED_PATTERNS) {
        if (pattern.test(text)) {
            return getBlockResponse(category);
        }
    }

    // 语义关键词检查
    for (const keyword of SUSPICIOUS_KEYWORDS) {
        if (text.includes(keyword)) {
            return {
                type: 'emit',
                payload: {
                    content: '检测到可疑请求关键词。请描述合法的开发或研究目标，我不能帮助执行可能违反安全策略的操作。'
                }
            };
        }
    }

    // 上下文检查（如果提供了历史消息）
    if (messageHistory && messageHistory.length > 0) {
        const contextCheck = checkContextSafety(messageHistory);
        if (contextCheck) {
            return contextCheck;
        }
    }

    return null;
}

function getBlockResponse(category: string): EmitOutput {
    const messages: Record<string, string> = {
        system_destroy: '⚠️ 安全限制：我不能帮助执行可能破坏系统、删除数据或格式化设备的操作。请描述建设性的目标。',
        data_theft: '⚠️ 安全限制：我不能帮助窃取、爬取或未经授权获取敏感数据。请确保你的请求符合数据使用规范。',
        cyber_attack: '⚠️ 安全限制：我不能帮助执行网络攻击、漏洞扫描或类似操作。如需进行安全测试，请使用授权的专业工具。',
        security_bypass: '⚠️ 安全限制：我不能帮助绕过安全机制、破解验证或创建虚假凭证。',
        malware: '⚠️ 安全限制：我不能帮助创建恶意软件、病毒、钓鱼网站等有害内容。',
        illegal_content: '⚠️ 安全限制：我不能生成涉及违法内容的信息。',
    };

    return {
        type: 'emit',
        payload: {
            content: messages[category] || '⚠️ 安全限制：该请求无法执行。'
        }
    };
}

function checkContextSafety(messageHistory: Message[]): EmitOutput | null {
    // 检查历史消息中是否有累积的可疑模式
    const recentUserMessages = messageHistory
        .filter(m => m.role === 'user')
        .slice(-5); // 检查最近 5 条用户消息

    // 1. 检查历史消息中是否包含敏感词
    const allText = recentUserMessages.map(m => m.content).join(' ');
    for (const { pattern, category } of BANNED_PATTERNS) {
        if (pattern.test(allText)) {
            return getBlockResponse(category);
        }
    }

    // 2. 检查是否有语义可疑关键词
    for (const keyword of SUSPICIOUS_KEYWORDS) {
        if (allText.includes(keyword)) {
            return {
                type: 'emit',
                payload: {
                    content: '检测到历史对话中包含可疑请求关键词。请描述合法的开发或研究目标，我不能帮助执行可能违反安全策略的操作。'
                }
            };
        }
    }

    // 3. 检查用户是否多次尝试相似的危险请求（绕过检测）
    const dangerousKeywords = ['绕过', '破解', '入侵', '攻击', '删除', '窃取', '格式化'];
    const dangerousMessageCount = recentUserMessages.filter(m =>
        dangerousKeywords.some(k => m.content.includes(k))
    ).length;

    // 如果最近 5 条消息中有 3 条以上包含危险词，判定为可疑模式
    if (dangerousMessageCount >= 3) {
        return {
            type: 'emit',
            payload: {
                content: '⚠️ 安全提醒：检测到您的多次请求涉及敏感操作。请说明您的合法使用场景，或联系管理员获取帮助。'
            }
        };
    }

    // 4. 检查是否存在"分步绕过"行为（将一个危险请求拆分成多步）
    // 例如：第一步问"如何获取系统权限"，第二步问"如何隐藏登录日志"
    const stepPatterns: [RegExp, RegExp][] = [
        [/权限/, /日志 | 痕迹 | 记录/],  // 获取权限 + 消除痕迹
        [/入侵/, /方法 | 步骤 | 如何/],  // 入侵 + 具体方法
        [/绕过/, /验证 | 登录 | 安全/],  // 绕过 + 验证机制
    ];

    for (const [pattern1, pattern2] of stepPatterns) {
        const hasPattern1 = recentUserMessages.some(m => pattern1.test(m.content));
        const hasPattern2 = recentUserMessages.some(m => pattern2.test(m.content));
        if (hasPattern1 && hasPattern2) {
            return {
                type: 'emit',
                payload: {
                    content: '⚠️ 安全提醒：检测到您的请求组合可能涉及不安全操作。请说明您的合法使用场景。'
                }
            };
        }
    }

    return null;
}
