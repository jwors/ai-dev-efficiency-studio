# LLM 流式输出改造规划文档

## 一、当前架构分析

### 1.1 核心调用链路

```
前端页面
    ↓ fetch POST (JSON Request/Response)
API 路由
    ↓ runPlugins()
插件系统
    ↓ callLLM()
LLM 核心
    ↓ withFallback()
熔断降级
    ↓ withRetry()
重试机制
    ↓ provider.call()
Qwen/Mock Provider
    ↓ fetch POST (非流式)
外部 LLM API (阿里云通义千问)
```

### 1.2 关键文件职责

| 文件路径 | 职责 | 返回类型 |
|---------|------|----------|
| `core/llm/index.ts` | LLM 调用主入口 | `Promise<LLMRawResponse>` |
| `core/llm/types.ts` | 类型定义 | `LLMProvider`, `LLMCallOptions` |
| `core/llm/retry.ts` | 重试机制（指数退避+抖动） | `withRetry<T>()` |
| `core/llm/fallback.ts` | 熔断器模式 | `withFallback<T>()` |
| `core/llm/error.ts` | 错误标准化 | `LLMError` |
| `core/llm/providers/qwen.ts` | Qwen API 调用 | `Promise<LLMRawResponse>` |
| `core/llm/tokenBudget.ts` | Token 预算控制 | 各类预算检查函数 |

### 1.3 类型定义现状

```typescript
// core/types/session.ts
export interface LLMRawResponse {
  content: string;
  meta: {
    id?: string;
    created?: number;
    model?: string;
    provider?: string;
    attemptCount?: number;
  };
}

// core/llm/types.ts
export interface LLMProvider {
  name: LLMProviderName;
  call(prompt: Message[], options?: LLMCallOptions): Promise<LLMRawResponse>
}

export interface LLMCallOptions {
  requestId?: string;
  timeoutMs?: number;
}
```

### 1.4 前端调用方式

当前所有前端页面都使用标准的 `fetch` + `JSON` 模式：

```typescript
// app/plugin/wbs/page.tsx (示例)
const response = await fetch('/api/wbs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input, uuid: sessionId }),
});
const data = await response.json();
```

---

## 二、改造范围分析

### 2.1 需要修改的文件

#### 核心层（必须修改）

| 文件 | 改造内容 | 优先级 |
|------|----------|--------|
| `core/llm/types.ts` | 添加流式类型定义 | P0 |
| `core/llm/index.ts` | 新增 `callLLMStream()` 函数 | P0 |
| `core/llm/providers/qwen.ts` | 实现流式调用 `stream()` | P0 |
| `core/llm/providers/mock.ts` | 实现模拟流式输出 | P1 |

#### API 路由层（必须修改）

| 文件 | 改造内容 | 优先级 |
|------|----------|--------|
| `app/api/run/route.ts` | 返回 SSE 流 | P0 |
| `app/api/wbs/route.ts` | 返回 SSE 流 | P0 |
| `app/api/architect/route.ts` | 返回 SSE 流 | P0 |
| `app/api/plan/route.ts` | 返回 SSE 流 | P1 |

#### 前端层（必须修改）

| 文件 | 改造内容 | 优先级 |
|------|----------|--------|
| `app/plugin/wbs/page.tsx` | 使用 EventSource/fetch 流式读取 | P0 |
| `app/plugin/architect/page.tsx` | 使用 EventSource/fetch 流式读取 | P0 |
| `app/page.tsx` | 使用 EventSource/fetch 流式读取 | P1 |

#### 类型定义（必须修改）

| 文件 | 改造内容 | 优先级 |
|------|----------|--------|
| `core/types/session.ts` | 添加流式响应类型 | P0 |

### 2.2 类型定义变更

```typescript
// 新增流式相关类型

// 流式响应事件类型
export type StreamEventType =
  | 'content'      // 内容增量
  | 'metadata'     // 元数据（模型、provider等）
  | 'done'         // 完成
  | 'error';       // 错误

// 流式事件
export interface StreamEvent {
  type: StreamEventType;
  data: {
    delta?: string;           // 增量内容
    content?: string;         // 完整内容（done时）
    meta?: LLMRawResponse['meta'];  // 元数据
    error?: string;           // 错误信息
  };
}

// 流式 Provider 接口
export interface LLMStreamProvider extends LLMProvider {
  stream?(
    prompt: Message[],
    options?: LLMCallOptions
  ): AsyncGenerator<StreamEvent>;
}

// 流式调用选项
export interface LLMStreamOptions extends LLMCallOptions {
  onChunk?: (chunk: string) => void;     // 实时回调
  onComplete?: (full: string) => void;   // 完成回调
  onError?: (error: Error) => void;      // 错误回调
}
```

### 2.3 API 层变更

Next.js API Route 支持流式响应，需要：

```typescript
// 使用 ReadableStream + TextEncoder
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of callLLMStream(prompt)) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 三、影响评估

### 3.1 对现有功能的影响

| 功能 | 影响程度 | 说明 |
|------|----------|------|
| JSON 解析逻辑 | 高 | 流式输出需要增量解析或缓冲后解析 |
| Token 预算控制 | 中 | 需要在流开始前预算，完成后核销 |
| 会话历史更新 | 低 | 完成后统一更新即可 |
| 插件系统 | 中 | 插件接口需要支持流式 |

### 3.2 对重试/熔断机制的影响

#### 重试机制 (`withRetry`)

**问题**: 流式响应无法简单地"重试"，因为：
1. 部分数据已发送给客户端
2. 无法"撤回"已发送的数据
3. 重试会导致数据重复

**解决方案**:

```typescript
// 方案 A: 流启动前验证，失败可重试
async function callLLMStreamWithRetry(prompt: Message[]) {
  return withRetry(async () => {
    // 先验证连接有效性（可选：发送空请求或预热请求）
    await verifyProviderHealth();
    // 返回流生成器，不等待完成
    return createStreamGenerator(prompt);
  }, retryPolicy);
}

// 方案 B: 流式响应不支持重试，依赖熔断降级
// 流式场景下更依赖熔断器提前排除不健康的 Provider
```

#### 熔断机制 (`withFallback`)

**问题**: 流式响应降级更复杂

**解决方案**:

```typescript
// 在流开始前检查熔断状态
async function callLLMStreamWithFallback(prompt: Message[]) {
  const availableProviders = providers.filter(
    p => !isCircuitOpen(p.name)
  );

  if (!availableProviders.length) {
    throw new LLMError('All providers circuit open', { kind: 'server' });
  }

  // 选择第一个健康的 Provider
  return availableProviders[0].stream(prompt);
}
```

### 3.3 对错误处理的影响

| 错误阶段 | 当前处理 | 流式处理 |
|----------|----------|----------|
| 请求前 | 抛出异常，客户端收到 500 | 同上 |
| 请求中（网络） | 整体重试 | 发送 error 事件，客户端显示错误 |
| 请求中（API 错误） | 整体重试 | 发送 error 事件 |
| 响应解析 | 抛出解析异常 | 流结束后检测，回退或提示 |

### 3.4 对 Token 计费的影响

**当前流程**:
```typescript
// planner.ts
const reservedTokens = estimateMessagesTokens(context);
await recordTokenUsage(sessionId, reservedTokens, context);
const rawText = await callLLM(context);
```

**流式流程**:

```typescript
// 方案：预估 + 核销
async function streamWithTokenTracking(prompt: Message[], sessionId: string) {
  // 1. 预估并预留
  const reservedTokens = estimateMessagesTokens(prompt);
  await reserveUserTokenUsage(sessionId, reservedTokens);

  let fullContent = '';

  try {
    // 2. 流式收集
    for await (const event of callLLMStream(prompt)) {
      if (event.type === 'content') {
        fullContent += event.data.delta;
        yield event;
      }
    }

    // 3. 计算实际使用（输入 + 输出）
    const actualTokens = estimateMessagesTokens(prompt) + estimateTokens(fullContent);

    // 4. 差额退还
    const refundTokens = reservedTokens - actualTokens;
    if (refundTokens > 0) {
      await refundUserTokenUsage(sessionId, refundTokens);
    } else if (refundTokens < 0) {
      // 超出预估，补充扣费
      await reserveUserTokenUsage(sessionId, Math.abs(refundTokens));
    }
  } catch (error) {
    // 5. 失败全额退还
    await refundUserTokenUsage(sessionId, reservedTokens);
    throw error;
  }
}
```

---

## 四、实施计划

### Phase 1: 基础设施（1-2 天）

**目标**: 建立流式输出的类型和接口基础

1. **新增类型定义** (`core/llm/types.ts`)
   - `StreamEventType`
   - `StreamEvent`
   - `LLMStreamOptions`

2. **扩展核心类型** (`core/types/session.ts`)
   - `LLMStreamResponse` 类型

3. **新增流式工具函数** (`core/llm/stream.ts`)
   - `createSSEEncoder()` - SSE 编码器
   - `parseSSEEvent()` - SSE 解析器

### Phase 2: Provider 层改造（2-3 天）

**目标**: 实现 Qwen Provider 的流式调用

1. **Qwen 流式实现** (`core/llm/providers/qwen.ts`)
   ```typescript
   async *stream(prompt: Message[], options?: LLMCallOptions): AsyncGenerator<StreamEvent> {
     const response = await fetch(url, {
       body: JSON.stringify({ ...body, stream: true }),
     });

     const reader = response.body.getReader();
     const decoder = new TextDecoder();

     while (true) {
       const { done, value } = await reader.read();
       if (done) break;

       const chunk = decoder.decode(value);
       // 解析 SSE 事件
       const events = parseSSE(chunk);
       for (const event of events) {
         yield { type: 'content', data: { delta: event.choices[0].delta.content } };
       }
     }

     yield { type: 'done', data: {} };
   }
   ```

2. **Mock 流式实现** (`core/llm/providers/mock.ts`)
   - 模拟分块输出

3. **更新 Provider 接口**
   - 添加可选的 `stream()` 方法

### Phase 3: 核心层改造（2-3 天）

**目标**: 实现 `callLLMStream()` 主函数

1. **新增流式入口** (`core/llm/index.ts`)
   ```typescript
   export async function* callLLMStream(
     prompt: Message[],
     options?: LLMStreamOptions
   ): AsyncGenerator<StreamEvent> {
     // 1. Provider 选择（考虑熔断状态）
     // 2. 流式调用
     // 3. 元数据增强
   }
   ```

2. **熔断器适配** (`core/llm/fallback.ts`)
   - 新增 `selectHealthyProvider()` 函数
   - 流式场景下提前检查熔断状态

3. **Token 计费适配** (`core/llm/tokenBudget.ts`)
   - 新增 `streamWithTokenTracking()` 包装函数

### Phase 4: API 路由改造（2-3 天）

**目标**: 改造 API 路由支持 SSE 响应

1. **创建通用流式响应工具** (`lib/streamResponse.ts`)
   ```typescript
   export function createSSEResponse(generator: AsyncGenerator<StreamEvent>) {
     const encoder = new TextEncoder();
     return new Response(
       new ReadableStream({
         async start(controller) {
           for await (const event of generator) {
             controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
           }
           controller.close();
         },
       }),
       { headers: { 'Content-Type': 'text/event-stream' } }
     );
   }
   ```

2. **改造单个路由**
   - `/api/wbs` (P0)
   - `/api/architect` (P0)
   - `/api/run` (P0)
   - `/api/plan` (P1)

### Phase 5: 前端改造（2-3 天）

**目标**: 前端支持流式数据接收和渲染

1. **创建流式请求 Hook** (`lib/hooks/useStreamRequest.ts`)
   ```typescript
   export function useStreamRequest<T>(url: string) {
     const [data, setData] = useState<T | null>(null);
     const [partialContent, setPartialContent] = useState('');
     const [loading, setLoading] = useState(false);

     const execute = async (body: any) => {
       setLoading(true);
       setPartialContent('');

       const response = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
       const reader = response.body.getReader();
       const decoder = new TextDecoder();

       while (true) {
         const { done, value } = await reader.read();
         if (done) break;

         const text = decoder.decode(value);
         const events = parseSSEEvents(text);

         for (const event of events) {
           if (event.type === 'content') {
             setPartialContent(prev => prev + event.data.delta);
           } else if (event.type === 'done') {
             setData(event.data.content);
           }
         }
       }

       setLoading(false);
     };

     return { data, partialContent, loading, execute };
   }
   ```

2. **改造页面组件**
   - WBS 页面
   - Architect 页面
   - 主页面

### Phase 6: 测试与优化（1-2 天）

1. **单元测试**
   - 流式 Provider 测试
   - SSE 解析测试
   - Token 计费测试

2. **集成测试**
   - 端到端流式流程测试
   - 错误场景测试
   - 中断恢复测试

3. **性能优化**
   - 背压控制
   - 内存优化

---

## 五、风险与缓解措施

### 5.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| JSON 解析失败 | 高 | 流结束后验证，提供重试按钮 |
| 网络中断 | 中 | 实现断点续传或重新请求 |
| 浏览器兼容性 | 低 | 使用 polyfill 或降级方案 |

### 5.2 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 计费不准 | 高 | 详细日志记录，定期对账 |
| 用户体验下降 | 中 | 保留非流式接口作为降级方案 |
| 迁移成本 | 中 | 渐进式迁移，先新后旧 |

---

## 六、兼容性策略

### 6.1 API 版本控制

```typescript
// 保留非流式接口
POST /api/wbs          // 非流式（现有）
POST /api/wbs/stream   // 流式（新增）

// 或通过请求头区分
POST /api/wbs
  Accept: application/json        // 非流式
  Accept: text/event-stream       // 流式
```

### 6.2 Provider 接口兼容

```typescript
export interface LLMProvider {
  name: LLMProviderName;
  call(prompt: Message[], options?: LLMCallOptions): Promise<LLMRawResponse>;
  // 可选流式方法
  stream?(prompt: Message[], options?: LLMCallOptions): AsyncGenerator<StreamEvent>;
}
```

---

## 七、总结

### 改造收益

1. **用户体验提升**: 实时看到生成内容，减少等待焦虑
2. **感知延迟降低**: 首字节时间从 30s+ 降至 1-2s
3. **交互性增强**: 支持中途取消、实时反馈

### 改造成本

1. **开发工时**: 约 10-15 人天
2. **测试工时**: 约 3-5 人天
3. **风险**: 中等（可降级）

### 建议

1. 优先改造 WBS 和 Architect 插件（用户感知最明显）
2. 保留非流式接口作为降级方案
3. 分阶段灰度发布

---

## 八、关键文件清单

| 文件路径 | 改造类型 | 说明 |
|----------|----------|------|
| `core/llm/index.ts` | 修改 | 新增 `callLLMStream()` 函数 |
| `core/llm/types.ts` | 修改 | 新增流式相关类型 |
| `core/llm/providers/qwen.ts` | 修改 | 实现流式调用 |
| `core/llm/fallback.ts` | 修改 | 流式场景熔断检查 |
| `core/llm/tokenBudget.ts` | 修改 | 流式 Token 计费 |
| `app/api/wbs/route.ts` | 修改 | SSE 响应 |
| `app/api/architect/route.ts` | 修改 | SSE 响应 |
| `app/plugin/wbs/page.tsx` | 修改 | 流式读取 |
| `app/plugin/architect/page.tsx` | 修改 | 流式读取 |