# 配置参数说明

本文档详细说明 AI Efficiency Studio 的所有配置参数。

## 配置来源

配置通过环境变量管理，位于 `.env` 文件中。

```env
# .env.example

# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/ai_efficiency"

# NextAuth 配置
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# LLM 提供者配置
LLM_PROVIDER="qwen"
LLM_FALLBACK_PROVIDER="mock"
QWEN_API_KEY="your-api-key"

# 重试策略
LLM_TIMEOUT_MS=12000
LLM_MAX_RETRIES=3
LLM_BASE_DELAY_MS=400
LLM_MAX_DELAY_MS=4000
LLM_JITTER_RATIO=0.2

# 熔断器配置
LLM_CIRCUIT_FAILURE_THRESHOLD=3
LLM_CIRCUIT_OPEN_MS=30000

# Token 预算
REQUEST_MAX_TOKENS=4000
SESSION_MAX_TOKENS=50000
```

## 配置对象

所有配置通过 `core/config/index.ts` 统一管理：

```typescript
export const config = {
  // LLM 提供者
  llmProvider: process.env.LLM_PROVIDER ?? 'mock',
  llmFallbackProvider: process.env.LLM_FALLBACK_PROVIDER ?? 'mock',

  // 超时与重试
  llmTimeoutMs: parseEnvNumber(process.env.LLM_TIMEOUT_MS, 12000),
  llmMaxRetries: parseEnvNumber(process.env.LLM_MAX_RETRIES, 3),
  llmBaseDelayMs: parseEnvNumber(process.env.LLM_BASE_DELAY_MS, 400),
  llmMaxDelayMs: parseEnvNumber(process.env.LLM_MAX_DELAY_MS, 4000),
  llmJitterRatio: parseEnvNumber(process.env.LLM_JITTER_RATIO, 0.2),

  // 熔断器
  llmCircuitFailureThreshold: parseEnvNumber(process.env.LLM_CIRCUIT_FAILURE_THRESHOLD, 3),
  llmCircuitOpenMs: parseEnvNumber(process.env.LLM_CIRCUIT_OPEN_MS, 30000),

  // API 密钥
  qwenApiKey: process.env.QWEN_API_KEY ?? '',

  // Token 预算
  requestMaxTokens: parseEnvNumber(process.env.REQUEST_MAX_TOKENS, 4000),
  sessionMaxTokens: parseEnvNumber(process.env.SESSION_MAX_TOKENS, 50000),
};
```

---

## LLM 提供者配置

### LLM_PROVIDER

主 LLM 提供者。

| 值 | 说明 |
|---|------|
| `qwen` | 通义千问（生产推荐） |
| `mock` | 测试模拟提供者 |

**默认值**: `mock`

**示例**:
```env
LLM_PROVIDER=qwen
```

### LLM_FALLBACK_PROVIDER

备用 LLM 提供者。当主提供者失败时自动切换。

**默认值**: `mock`

**示例**:
```env
LLM_FALLBACK_PROVIDER=mock
```

### QWEN_API_KEY

通义千问 API 密钥。

**获取方式**: [阿里云百炼平台](https://dashscope.console.aliyun.com/)

**示例**:
```env
QWEN_API_KEY=sk-xxxxxxxxxxxx
```

---

## 重试策略配置

### LLM_TIMEOUT_MS

单个 LLM 请求超时时间（毫秒）。

**默认值**: `12000`（12秒）

**推荐范围**: 5000 - 60000

**示例**:
```env
LLM_TIMEOUT_MS=30000
```

### LLM_MAX_RETRIES

最大重试次数。针对可恢复错误（429、5xx、超时、网络错误）。

**默认值**: `3`

**推荐范围**: 1 - 5

**示例**:
```env
LLM_MAX_RETRIES=2
```

### LLM_BASE_DELAY_MS

重试基础延迟（毫秒）。首次重试前的等待时间。

**默认值**: `400`

**推荐范围**: 100 - 1000

**示例**:
```env
LLM_BASE_DELAY_MS=500
```

### LLM_MAX_DELAY_MS

重试最大延迟（毫秒）。延迟上限，避免过长等待。

**默认值**: `4000`

**推荐范围**: 2000 - 30000

**示例**:
```env
LLM_MAX_DELAY_MS=10000
```

### LLM_JITTER_RATIO

抖动比例。在退避时间上增加随机量，避免惊群效应。

**默认值**: `0.2`（20%）

**推荐范围**: 0.1 - 0.5

**计算公式**: `delay = expDelay + random(0, expDelay * jitterRatio)`

**示例**:
```env
LLM_JITTER_RATIO=0.3
```

---

## 熔断器配置

### LLM_CIRCUIT_FAILURE_THRESHOLD

熔断器触发阈值。连续失败次数达到此值后开路。

**默认值**: `3`

**推荐范围**: 2 - 10

**示例**:
```env
LLM_CIRCUIT_FAILURE_THRESHOLD=5
```

### LLM_CIRCUIT_OPEN_MS

熔断器开路时间（毫秒）。开路期间该提供者被跳过。

**默认值**: `30000`（30秒）

**推荐范围**: 10000 - 120000

**示例**:
```env
LLM_CIRCUIT_OPEN_MS=60000
```

---

## Token 预算配置

### REQUEST_MAX_TOKENS

单次请求最大 Token 数。

**默认值**: `4000`

**推荐范围**: 2000 - 16000

**示例**:
```env
REQUEST_MAX_TOKENS=8000
```

### SESSION_MAX_TOKENS

单个会话最大 Token 预算。

**默认值**: `50000`

**推荐范围**: 10000 - 500000

**示例**:
```env
SESSION_MAX_TOKENS=100000
```

---

## 数据库配置

### DATABASE_URL

PostgreSQL 连接字符串。

**格式**: `postgresql://用户名:密码@主机:端口/数据库名`

**示例**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_efficiency"
```

**云数据库示例**:
```env
DATABASE_URL="postgresql://user:pass@host.amazonaws.com:5432/production"
```

---

## 认证配置

### NEXTAUTH_SECRET

NextAuth.js 加密密钥。用于加密 JWT 和其他敏感数据。

**生成方式**:
```bash
openssl rand -base64 32
```

**示例**:
```env
NEXTAUTH_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

### NEXTAUTH_URL

应用 URL。生产环境必须设置。

**开发环境**: `http://localhost:3000`

**生产环境**: `https://your-domain.com`

**示例**:
```env
NEXTAUTH_URL="https://ai-studio.example.com"
```

---

## 环境配置示例

### 开发环境

```env
# .env.local

# 数据库
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_efficiency_dev"

# NextAuth
NEXTAUTH_SECRET="dev-secret-key-not-for-production"
NEXTAUTH_URL="http://localhost:3000"

# LLM
LLM_PROVIDER=mock
LLM_FALLBACK_PROVIDER=mock
LLM_TIMEOUT_MS=30000
LLM_MAX_RETRIES=2

# Token 预算（开发环境宽松）
REQUEST_MAX_TOKENS=8000
SESSION_MAX_TOKENS=100000
```

### 生产环境

```env
# .env.production

# 数据库
DATABASE_URL="postgresql://user:password@prod-host:5432/ai_efficiency"

# NextAuth
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://ai-studio.example.com"

# LLM
LLM_PROVIDER=qwen
LLM_FALLBACK_PROVIDER=mock
QWEN_API_KEY="${QWEN_API_KEY}"

# 重试策略（生产环境保守）
LLM_TIMEOUT_MS=15000
LLM_MAX_RETRIES=3
LLM_BASE_DELAY_MS=500
LLM_MAX_DELAY_MS=8000
LLM_JITTER_RATIO=0.3

# 熔断器
LLM_CIRCUIT_FAILURE_THRESHOLD=5
LLM_CIRCUIT_OPEN_MS=60000

# Token 预算
REQUEST_MAX_TOKENS=4000
SESSION_MAX_TOKENS=50000
```

---

## 参数调优指南

### 高可靠性场景

适用于对稳定性要求高的生产环境：

```env
LLM_MAX_RETRIES=5
LLM_TIMEOUT_MS=20000
LLM_CIRCUIT_FAILURE_THRESHOLD=3
LLM_CIRCUIT_OPEN_MS=30000
LLM_FALLBACK_PROVIDER=qwen-backup
```

### 低延迟场景

适用于对响应速度要求高的场景：

```env
LLM_MAX_RETRIES=2
LLM_TIMEOUT_MS=8000
LLM_BASE_DELAY_MS=200
LLM_MAX_DELAY_MS=2000
```

### 高并发场景

适用于大量并发请求：

```env
LLM_JITTER_RATIO=0.5
LLM_CIRCUIT_FAILURE_THRESHOLD=5
LLM_CIRCUIT_OPEN_MS=60000
```

---

## 运行时读取

### 在代码中访问配置

```typescript
import { config } from '@/core/config';

console.log(config.llmProvider);
console.log(config.llmTimeoutMs);
```

### 添加新配置项

1. 在 `.env` 中添加环境变量
2. 在 `core/config/index.ts` 中添加解析逻辑

```typescript
export const config = {
  // 现有配置...

  // 新增配置
  newConfig: process.env.NEW_CONFIG ?? 'default_value',
  newConfigNumber: parseEnvNumber(process.env.NEW_CONFIG_NUMBER, 100),
};
```

---

## 安全注意事项

1. **不要提交 `.env` 文件到版本控制**
   ```gitignore
   .env
   .env.local
   .env.production
   ```

2. **生产环境使用环境变量注入**
   - Vercel: 项目设置 → Environment Variables
   - Docker: `-e` 参数或 `env_file`
   - Kubernetes: ConfigMap/Secret

3. **敏感信息加密存储**
   - API 密钥使用密钥管理服务
   - 数据库密码定期轮换

4. **配置验证**
   ```typescript
   // 启动时验证必要配置
   if (!config.qwenApiKey && config.llmProvider === 'qwen') {
     throw new Error('QWEN_API_KEY is required when using qwen provider');
   }
   ```

---

## 配置问题排查

### LLM 调用超时

```
症状: LLM 请求频繁超时
排查: 检查 LLM_TIMEOUT_MS 是否过小
解决: 增加超时时间或检查网络
```

### 熔断器频繁触发

```
症状: Provider 被频繁跳过
排查: 检查 LLM_CIRCUIT_FAILURE_THRESHOLD 是否过小
解决: 增加阈值或修复上游问题
```

### Token 预算超限

```
症状: 请求被拒绝
排查: 检查用户 tokenQuota 和 tokenUsed
解决: 增加配额或清理历史数据
```