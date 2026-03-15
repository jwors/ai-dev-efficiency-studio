# 安全机制说明

本文档详细介绍 AI Efficiency Studio 的多层安全防护体系。

## 安全架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           三层安全防护体系                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Layer 1: InputGuard                         │   │
│  │                       输入层安全检测                              │   │
│  │  • 高风险模式拦截                                                 │   │
│  │  • 可疑关键词检测                                                 │   │
│  │  • 多轮上下文风险评分                                             │   │
│  │  • 输入长度限制                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Layer 2: PlanGuard                          │   │
│  │                       计划层安全检查                              │   │
│  │  • 危险搜索查询检测                                               │   │
│  │  • 敏感文件路径拦截                                               │   │
│  │  • 恶意内容检测                                                   │   │
│  │  • 内网访问拦截                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Layer 3: PolicyGuard                        │   │
│  │                       执行层策略控制                              │   │
│  │  • URL 白名单                                                     │   │
│  │  • HTTPS 强制                                                     │   │
│  │  • 内网 IP 拦截                                                   │   │
│  │  • 动态白名单                                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Layer 1: InputGuard（输入层）

### 功能概述

对用户输入进行第一道安全检测，拦截高风险请求。

### 检测内容

#### 1. 输入长度限制

```typescript
const MAX_INPUT_CHARS = 8000;

if (text.length > MAX_INPUT_CHARS) {
  return {
    type: "emit",
    payload: { content: `输入太长（>${MAX_INPUT_CHARS} 字）。` }
  };
}
```

#### 2. 高风险模式拦截（直接拦截）

命中以下模式直接拦截：

| 分类 | 模式示例 | 说明 |
|------|----------|------|
| **system_destroy** | `rm -rf`, `format disk`, `删除系统` | 系统破坏 |
| **data_theft** | `窃取密钥`, `dump database`, `爬取用户数据` | 数据窃取 |
| **cyber_attack** | `DDoS`, `漏洞利用`, `扫描端口` | 网络攻击 |
| **security_bypass** | `绕过验证`, `提权`, `破解密码` | 安全绕过 |
| **malware** | `编写木马`, `创建病毒`, `勒索软件` | 恶意软件 |
| **illegal_content** | `赌博`, `毒品`, `武器` | 违法内容 |

```typescript
const BANNED_PATTERNS: readonly RiskPattern[] = [
  {
    pattern: /(\brm\s+(-rf|--force)|\bdel\s+\/f|\bformat\s+\w:)/i,
    category: "system_destroy",
    hints: ["rm", "del", "format", "删除", "清空", "格式化"],
  },
  {
    pattern: /(窃取|盗取|偷|爬取).*(key|密钥|token|密码|凭证)/i,
    category: "data_theft",
    hints: ["窃取", "盗取", "爬取", "key", "token", "密钥"],
  },
  // ... 更多模式
];
```

#### 3. 可疑关键词检测

检测潜在风险请求：

```typescript
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
];
```

#### 4. 多轮上下文风险评分

分析历史对话与当前输入的组合风险。

**算法**:

```typescript
const CONTEXT_WINDOW = 6;      // 分析最近 6 轮对话
const DECAY = 0.65;            // 历史衰减系数
const CURRENT_WEIGHT = 0.78;   // 当前输入权重
const HISTORY_WEIGHT = 0.22;   // 历史输入权重
const BLOCK_THRESHOLD = 0.49;  // 拦截阈值

// 综合风险评分
totalRisk = clamp01(
  currentRisk * CURRENT_WEIGHT +
  historyRisk * HISTORY_WEIGHT +
  stepRisk -
  recoveryBonus
);

if (totalRisk >= BLOCK_THRESHOLD) {
  return { type: "emit", payload: { content: "安全限制：..." } };
}
```

**各分量说明**:

| 分量 | 计算方式 | 说明 |
|------|----------|------|
| `currentRisk` | 当前输入风险评分 | 单条文本风险 |
| `historyRisk` | 加权衰减评分 | 历史风险按时间衰减 |
| `stepRisk` | 逐步攻击评分 | 检测多步攻击组合 |
| `recoveryBonus` | 安全连胜奖励 | 连续安全对话降低风险 |

#### 5. 逐步式攻击检测

检测多轮对话中的攻击步骤组合：

```typescript
const stepPatterns: Array<[RegExp, RegExp]> = [
  [/权限|提权|管理员/i, /日志|痕迹|记录|清理/i],
  [/入侵|攻击|渗透|hack/i, /方法|步骤|流程|脚本/i],
  [/绕过|bypass|突破/i, /验证|登录|安全|鉴权/i],
];

// 如果历史中有 pattern1，当前输入有 pattern2，则风险增加
```

## Layer 2: PlanGuard（计划层）

### 功能概述

在 Executor 执行前，检查生成的 Plan 是否安全。

### 检测内容

#### 1. 危险搜索查询

```typescript
const DANGEROUS_SEARCH_QUERIES = [
  /漏洞利用|exploit/i,
  /免杀|bypass\s*antivirus/i,
  /提权|privilege\s*escalation/i,
  /后门|backdoor/i,
  /木马|trojan|webshell/i,
  /注入攻击|sql\s*injection/i,
  /跨站脚本|xss\s*attack/i,
  /密码破解|password\s*crack/i,
  /钓鱼网站|phishing\s*site/i,
  /DDoS|dos 攻击/i,
];

if (step.action === 'web.search') {
  const query = step.params?.query;
  for (const pattern of DANGEROUS_SEARCH_QUERIES) {
    if (pattern.test(query)) {
      return { blocked: true, reason: `搜索查询包含危险关键词` };
    }
  }
}
```

#### 2. 敏感文件路径

```typescript
const DANGEROUS_FILE_PATHS = [
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\.env$/i,
  /id_rsa/i,
  /credentials/i,
  /password/i,
];

if (step.action === 'file.write') {
  const path = step.params?.path;
  for (const pattern of DANGEROUS_FILE_PATHS) {
    if (pattern.test(path)) {
      return { blocked: true, reason: `试图写入敏感文件` };
    }
  }
}
```

#### 3. 恶意内容检测

```typescript
const dangerousContentPatterns = [
  /<\?php\s+\$eval/i,   // PHP webshell
  /bash\s+-i\s+>&/i,    // 反弹 shell
  /nc\s+-e\s+\/bin/i,   // netcat 反弹
  /chmod\s+777/i,       // 危险权限
  /rm\s+-rf\s+\//i,     // 删除根目录
];

if (step.action === 'file.write') {
  const content = step.params?.content;
  for (const pattern of dangerousContentPatterns) {
    if (pattern.test(content)) {
      return { blocked: true, reason: `文件内容包含危险代码` };
    }
  }
}
```

#### 4. 内网访问拦截

```typescript
const internalUrlPatterns = [
  /localhost/i,
  /127\.0\.0\.1/i,
  /192\.168\./i,
  /10\.\d+\./i,
  /172\.(1[6-9]|2[0-9]|3[01])\./i,
];

if (step.action === 'http') {
  const url = step.params?.url;
  for (const pattern of internalUrlPatterns) {
    if (pattern.test(url)) {
      return { blocked: true, reason: `试图访问内网地址` };
    }
  }
}
```

## Layer 3: PolicyGuard（执行层）

### 功能概述

在任务执行时进行实时策略控制。

### 检测内容

#### 1. URL 白名单

```typescript
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
  "duckduckgo.com",
];

function isAllowedHost(host: string, context: PolicyContext) {
  const h = normalizeHost(host);
  if (context.dynamicAllowlist.has(h)) return true;
  return ALLOWLIST.some((d) => h === d || h.endsWith(`.${d}`));
}
```

#### 2. HTTPS 强制

```typescript
if (u.protocol !== "https:") {
  throw new PolicyError("ONLY_HTTPS", "只允许 https 请求。");
}
```

#### 3. 内网 IP 拦截

```typescript
function isPrivateIP(ip: string) {
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
```

#### 4. 动态白名单

开发环境自动允许访问的域名：

```typescript
const DEV_AUTO_ALLOW = process.env.NODE_ENV !== 'production';

if (!isAllowedHost(u.hostname, context)) {
  if (DEV_AUTO_ALLOW) {
    context.dynamicAllowlist.add(h);
    console.warn(`[policy] auto-allow domain (dev): ${h}`);
    return;
  }
  throw new PolicyError("DOMAIN_NOT_ALLOWED", `域名不在白名单`);
}
```

### 策略上下文

每个会话有独立的策略上下文，实现会话级隔离：

```typescript
interface PolicyContext {
  dynamicAllowlist: Set<string>;
}

// 在执行时创建/复用
if (!state.policyContext) {
  state.policyContext = createPolicyContext();
}
```

## 错误类型

### PolicyError

```typescript
class PolicyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
```

### 错误代码

| 代码 | 说明 |
|------|------|
| `BAD_URL` | 非法 URL 格式 |
| `ONLY_HTTPS` | 仅允许 HTTPS |
| `NO_LOCALHOST` | 禁止访问 localhost |
| `NO_PRIVATE_IP` | 禁止访问内网 IP |
| `DOMAIN_NOT_ALLOWED` | 域名不在白名单 |
| `MISSING_URL` | 缺少 URL 参数 |
| `MISSING_QUERY` | 缺少查询参数 |
| `UNKNOWN_TASK` | 未知任务类型 |

## 安全配置

### 环境变量

```env
# 生产环境关闭自动允许
NODE_ENV=production

# Token 预算控制
REQUEST_MAX_TOKENS=4000
SESSION_MAX_TOKENS=50000
```

### 调整参数

```typescript
// 输入检测参数
const MAX_INPUT_CHARS = 8000;
const CONTEXT_WINDOW = 6;
const BLOCK_THRESHOLD = 0.49;

// 白名单配置
const ALLOWLIST = [...];
```

## 安全最佳实践

### 1. 生产环境配置

```env
NODE_ENV=production
```

确保关闭开发环境的自动域名允许功能。

### 2. 定期更新规则

- 定期审查 `BANNED_PATTERNS`
- 更新 `DANGEROUS_SEARCH_QUERIES`
- 扩充 `ALLOWLIST` 白名单

### 3. 监控与告警

建议监控以下指标：

- 拦截率（拦截请求数 / 总请求数）
- 高风险模式命中分布
- 动态白名单使用情况

### 4. Token 预算控制

```typescript
// 用户级配额
tokenQuota: 50000

// 单次请求限制
REQUEST_MAX_TOKENS=4000

// 会话限制
SESSION_MAX_TOKENS=50000
```

### 5. 审计日志

系统自动记录：

- 拦截原因
- 触发的模式
- 风险评分
- 执行结果

## 绕过防护的缓解措施

| 攻击方式 | 防护措施 |
|----------|----------|
| 编码绕过 | 多种编码检测 |
| 分步攻击 | 多轮上下文风险评分 |
| 社会工程 | 敏感操作确认 |
| 零日漏洞 | 计划层安全检查 |
| 白名单滥用 | 域名严格匹配 |

## 升级与扩展

### 添加新的风险模式

```typescript
// core/security/inputGuard.ts
const BANNED_PATTERNS: readonly RiskPattern[] = [
  // 添加新模式
  {
    pattern: /新的风险模式/i,
    category: "new_category",
    hints: ["关键词1", "关键词2"],
  },
];
```

### 添加新的白名单域名

```typescript
// core/security/policyGuard.ts
const ALLOWLIST = [
  // 添加新域名
  "trusted-domain.com",
];
```

### 自定义错误响应

```typescript
function getBlockResponse(category: string): EmitOutput {
  const messages: Record<string, string> = {
    system_destroy: "安全限制：...",
    // 添加新的响应
    new_category: "安全限制：...",
  };
  // ...
}
```