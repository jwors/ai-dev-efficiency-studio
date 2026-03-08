import type { Message } from "../types/type";

export type EmitOutput = { type: "emit"; payload: { content: string } };

const MAX_INPUT_CHARS = 8000;

const CONTEXT_WINDOW = 6;
const DECAY = 0.65;
const CURRENT_WEIGHT = 0.78;
const HISTORY_WEIGHT = 0.22;
const BLOCK_THRESHOLD = 0.49;

const RECOVERY_SAFE_TURNS = 2;
const RECOVERY_REDUCE = 0.22;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

type RiskPattern = {
  pattern: RegExp;
  category: string;
  hints: readonly string[];
};

// 高风险模式：命中后直接拦截
const BANNED_PATTERNS: readonly RiskPattern[] = [
  {
    pattern: /(\brm\s+(-rf|--force)|\bdel\s+\/f|\bformat\s+\w:)/i,
    category: "system_destroy",
    hints: ["rm", "del", "format", "删除", "清空", "格式化", "wipe", "erase", "destroy"],
  },
  {
    pattern: /(删除|清空|格式化).*(文件|目录|磁盘|数据库|系统)/,
    category: "system_destroy",
    hints: ["删除", "清空", "格式化", "文件", "目录", "磁盘", "数据库", "系统"],
  },
  {
    pattern: /(wipe|erase|destroy).*(disk|system|database|filesystem)/i,
    category: "system_destroy",
    hints: ["wipe", "erase", "destroy", "disk", "system", "database", "filesystem"],
  },
  {
    pattern: /(窃取|盗取|偷|爬取).*(key|密钥|token|密码|凭证|隐私)/i,
    category: "data_theft",
    hints: ["窃取", "盗取", "爬取", "key", "token", "密钥", "密码", "凭证", "隐私"],
  },
  {
    pattern: /(导出|获取).*(全部|所有).*(用户数据|数据库)/i,
    category: "data_theft",
    hints: ["导出", "获取", "全部", "所有", "用户数据", "数据库"],
  },
  {
    pattern: /(dump|exfiltrate|steal).*(credential|cookie|session|database|user data)/i,
    category: "data_theft",
    hints: ["dump", "exfiltrate", "steal", "credential", "cookie", "session", "database", "user data"],
  },
  {
    pattern: /(攻击|入侵|hack|ddos|dos 攻击|洪水攻击)/i,
    category: "cyber_attack",
    hints: ["攻击", "入侵", "hack", "ddos", "dos", "洪水攻击"],
  },
  {
    pattern: /(扫描|探测).*(漏洞|端口|弱点)/i,
    category: "cyber_attack",
    hints: ["扫描", "探测", "漏洞", "端口", "弱点"],
  },
  {
    pattern: /(payload|exploit|botnet|c2|command and control)/i,
    category: "cyber_attack",
    hints: ["payload", "exploit", "botnet", "c2", "command and control"],
  },
  {
    pattern: /(绕过|破解|bypass|突破).*(安全|鉴权|权限|登录|验证)/i,
    category: "security_bypass",
    hints: ["绕过", "破解", "bypass", "突破", "鉴权", "权限", "登录", "验证", "安全"],
  },
  {
    pattern: /(生成|创建|制作).*(假|虚假|伪造|fake).*(证件|证书|签名|身份)/i,
    category: "security_bypass",
    hints: ["生成", "创建", "制作", "虚假", "伪造", "fake", "证件", "证书", "签名", "身份"],
  },
  {
    pattern: /(越权|提权|权限提升|privilege escalation)/i,
    category: "security_bypass",
    hints: ["越权", "提权", "权限提升", "privilege escalation"],
  },
  {
    pattern: /(编写|生成).*(病毒|木马|蠕虫|勒索软件|挖矿)/i,
    category: "malware",
    hints: ["编写", "生成", "病毒", "木马", "蠕虫", "勒索软件", "挖矿"],
  },
  {
    pattern: /(创建|编写).*(钓鱼|欺诈).*(网站|邮件|短信)/i,
    category: "malware",
    hints: ["创建", "编写", "钓鱼", "欺诈", "网站", "邮件", "短信"],
  },
  {
    pattern: /(keylogger|ransomware|trojan|backdoor|dropper)/i,
    category: "malware",
    hints: ["keylogger", "ransomware", "trojan", "backdoor", "dropper"],
  },
  {
    pattern: /(赌博|毒品|武器|军火)/,
    category: "illegal_content",
    hints: ["赌博", "毒品", "武器", "军火"],
  },
  {
    pattern: /(色情|成人).*(内容|图片|视频)/,
    category: "illegal_content",
    hints: ["色情", "成人", "内容", "图片", "视频"],
  },
];

// 可疑词：用于风险评分
const SUSPICIOUS_KEYWORDS = [
  "如何入侵",
  "怎么破解",
  "绕过验证",
  "跳过登录",
  "强制访问",
  "提权",
  "后门",
  "免杀",
  "漏洞利用",
  "撞库",
  "爆破",
  "社工",
  "钓鱼页面",
  "伪造身份",
  "窃取凭证",
] as const;

const QUICK_RISK_HINTS = new Set(
  [...SUSPICIOUS_KEYWORDS, ...BANNED_PATTERNS.flatMap((p) => p.hints)].map((s) => s.toLowerCase()),
);

function includesAnyHint(textLower: string, hints: readonly string[]): boolean {
  for (const hint of hints) {
    if (textLower.includes(hint.toLowerCase())) return true;
  }
  return false;
}

function mayContainRiskByQuickHints(text: string): boolean {
  const textLower = text.toLowerCase();
  for (const hint of QUICK_RISK_HINTS) {
    if (textLower.includes(hint)) return true;
  }
  return false;
}

// 检测单条文本风险
function scoreTextRisk(text: string): number {
  const t = text || "";
  if (!t) return 0;

  // point-2: 快速短路，避免无风险文本进入全量扫描
  if (!mayContainRiskByQuickHints(t)) return 0;

  const tLower = t.toLowerCase();
  let score = 0;

  let suspiciousHits = 0;
  for (const kw of SUSPICIOUS_KEYWORDS) {
    if (t.includes(kw)) suspiciousHits++;
  }
  score += Math.min(0.7, suspiciousHits * 0.22);

  let bannedHits = 0;
  for (const { pattern, hints } of BANNED_PATTERNS) {
    if (!includesAnyHint(tLower, hints)) continue;
    pattern.lastIndex = 0;
    if (pattern.test(t)) bannedHits++;
  }
  score += Math.min(0.9, bannedHits * 0.35);

  return clamp01(score);
}

function scoreHistoryWithDecayFromRisks(risks: number[]): number {
  if (!risks.length) return 0;

  let weighted = 0;
  let totalWeight = 0;

  for (let i = risks.length - 1, distance = 0; i >= 0; i--, distance++) {
    const w = Math.pow(DECAY, distance);
    weighted += risks[i] * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? clamp01(weighted / totalWeight) : 0;
}

function scoreStepwiseRisk(history: Message[], currentInput: string): number {
  const stepPatterns: Array<[RegExp, RegExp]> = [
    [/权限|提权|管理员/i, /日志|痕迹|记录|清理/i],
    [/入侵|攻击|渗透|hack/i, /方法|步骤|流程|脚本/i],
    [/绕过|bypass|突破/i, /验证|登录|安全|鉴权/i],
  ];

  let stepHits = 0;
  for (const [p1, p2] of stepPatterns) {
    const historyHasP1 = history.some((m) => {
      p1.lastIndex = 0;
      return p1.test(m.content);
    });
    const historyHasP2 = history.some((m) => {
      p2.lastIndex = 0;
      return p2.test(m.content);
    });

    p1.lastIndex = 0;
    p2.lastIndex = 0;
    const currentHasP1 = p1.test(currentInput);
    const currentHasP2 = p2.test(currentInput);

    if ((historyHasP1 && currentHasP2) || (historyHasP2 && currentHasP1)) {
      stepHits++;
    }
  }

  return clamp01(stepHits * 0.28);
}

function recentSafeStreakBonusFromRisks(historyRisks: number[], currentRisk: number): number {
  if (currentRisk > 0.1) return 0;

  let streak = 0;
  for (let i = historyRisks.length - 1; i >= 0; i--) {
    if (historyRisks[i] <= 0.1) streak++;
    else break;
  }

  return streak >= RECOVERY_SAFE_TURNS ? RECOVERY_REDUCE : 0;
}

// 基础检测
export function baseGuard(input: string): EmitOutput | null {
  const text = String(input ?? "");

  if (!text.trim()) {
    return {
      type: "emit",
      payload: {
        content: "请输入你的目标或问题，我才能开始规划。",
      },
    };
  }

  if (text.length > MAX_INPUT_CHARS) {
    return {
      type: "emit",
      payload: {
        content: `你的输入太长了（>${MAX_INPUT_CHARS} 字）。请缩短内容，或分多次提交。`,
      },
    };
  }

  // point-2: 快速短路，避免低风险文本的全量正则扫描
  if (!mayContainRiskByQuickHints(text)) {
    return null;
  }

  const textLower = text.toLowerCase();
  for (const { pattern, category, hints } of BANNED_PATTERNS) {
    if (!includesAnyHint(textLower, hints)) continue;
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return getBlockResponse(category);
    }
  }

  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (text.includes(keyword)) {
      return {
        type: "emit",
        payload: {
          content: "检测到可疑请求关键词。请描述明确、合法且安全的开发目标。",
        },
      };
    }
  }

  return null;
}

// 多轮对话内容检测
export function contextGuard(input: string, messageHistory?: Message[]): EmitOutput | null {
  const text = String(input ?? "");
  if (!messageHistory || messageHistory.length === 0) return null;
  return checkContextSafety(messageHistory, text);
}

function getBlockResponse(category: string): EmitOutput {
  const messages: Record<string, string> = {
    system_destroy: "安全限制：我不能协助执行可能破坏系统、删除数据或格式化设备的操作。",
    data_theft: "安全限制：我不能协助窃取、爬取或未授权获取敏感数据。",
    cyber_attack: "安全限制：我不能协助执行网络攻击、漏洞利用或扫描攻击目标。",
    security_bypass: "安全限制：我不能协助绕过安全机制、破解验证或伪造身份凭证。",
    malware: "安全限制：我不能协助创建恶意软件、钓鱼页面或欺诈内容。",
    illegal_content: "安全限制：我不能生成涉及违法或违禁内容的信息。",
  };

  return {
    type: "emit",
    payload: {
      content: messages[category] || "安全限制：该请求无法执行。",
    },
  };
}

// 检测上下文安全性

function checkContextSafety(messageHistory: Message[], currentInput: string): EmitOutput | null {
  // Legacy (kept for reference): old hard-block context strategy.
  // const recentUserMessages = messageHistory
  //   .filter((m) => m.role === "user")
  //   .slice(-5);
  //
  // const stepPatterns: [RegExp, RegExp][] = [
  //   [/权限/, /日志|痕迹|记录/],
  //   [/入侵/, /方法|步骤/],
  //   [/绕过/, /验证|登录|安全|跳过/],
  // ];
  //
  // for (const [pattern1, pattern2] of stepPatterns) {
  //   const historyHasPattern1 = recentUserMessages.some((m) => pattern1.test(m.content));
  //   const currentHasPattern2 = pattern2.test(currentInput);
  //
  //   const currentHasPattern1 = pattern1.test(currentInput);
  //   const historyHasPattern2 = recentUserMessages.some((m) => pattern2.test(m.content));
  //
  //   if ((historyHasPattern1 && currentHasPattern2) || (currentHasPattern1 && historyHasPattern2)) {
  //     return {
  //       type: "emit",
  //       payload: {
  //         content: "安全提醒：检测到请求组合可能涉及不安全操作，请说明合法使用场景。",
  //       },
  //     };
  //   }
  // }
  //
  // return null;

  // point-3: 只做一次 user 过滤和窗口截取，并复用预计算风险分
  /*
    过滤出自己 user 内容并拿出最近六条
  */
  const recentUserMessages = messageHistory.filter((m) => m.role === "user").slice(-CONTEXT_WINDOW);
  if (recentUserMessages.length === 0) return null;

  // 检测历史内容的风险值
  const historyRisks = recentUserMessages.map((m) => scoreTextRisk(m.content));

  // 当轮风险
  const currentRisk = scoreTextRisk(currentInput);

  // 历史风险
  const historyRisk = scoreHistoryWithDecayFromRisks(historyRisks);
  const stepRisk = scoreStepwiseRisk(recentUserMessages, currentInput);
  const recoveryBonus = recentSafeStreakBonusFromRisks(historyRisks, currentRisk);

  const totalRisk = clamp01(
    currentRisk * CURRENT_WEIGHT + historyRisk * HISTORY_WEIGHT + stepRisk - recoveryBonus,
  );

  if (totalRisk >= BLOCK_THRESHOLD) {
    return {
      type: "emit",
      payload: {
        content: "安全限制：检测到多轮上下文组合存在较高风险，请调整为明确的安全开发需求。",
      },
    };
  }

  return null;
}
