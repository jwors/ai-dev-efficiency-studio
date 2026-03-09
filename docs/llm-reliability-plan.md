# LLM 稳定性方案（重试 + 降级）

## 1. 目标
- 为瞬时故障增加重试能力（`429`、`5xx`、超时、网络错误）。
- 当主 Provider 不稳定时，自动切换到备 Provider，提升可用性。
- 引入轻量熔断，避免对异常 Provider 持续施压导致雪崩。
- 保持业务层调用不变（仍通过统一入口 `callLLM` 调用）。

## 2. 改造范围
- `core/llm/index.ts`：统一编排入口（`retry -> fallback`）。
- `core/llm/retry.ts`：指数退避 + 抖动重试策略。
- `core/llm/fallback.ts`：Provider 降级与熔断策略。
- `core/llm/error.ts`：错误归一化与可重试分类。
- `core/llm/providers/qwen.ts`：超时控制 + HTTP 状态到错误类型映射。
- `core/llm/init.ts`：主/备 Provider 链式初始化。
- `core/config/index.ts`：重试、超时、熔断参数环境化。

```txt
指数退避（Exponential Backoff）

每次重试等待时间按指数增长，常见是翻倍。
例子：400ms -> 800ms -> 1600ms -> 3200ms（通常再设最大上限）。
目的：系统出故障时，减少瞬间重压，给服务恢复时间。
抖动（Jitter）

在退避时间上再加一点随机量，避免大量请求同一时刻一起重试（惊群）。
你当前实现是：delay = expDelay + random(0, expDelay * jitterRatio)。
例子：expDelay=800ms, jitterRatio=0.2，实际等待在 800~960ms 之间随机。
为什么要一起用：

只用指数退避：大家还是可能“整齐地”一起重试。
加抖动后：重试被打散，成功率更高，对下游更友好。
```

## 3. 架构设计
- 请求链路：
  1. 调用方执行 `callLLM(messages)`。
  2. `withFallback` 按优先级选择 Provider。
  3. 对每个 Provider，`withRetry` 仅对可恢复错误执行重试。
  4. 当前 Provider 重试后仍失败，则自动切换下一个 Provider。
  5. 所有 Provider 均失败时，抛出归一化后的聚合 `LLMError`。
- 熔断机制：
  - 维护进程内的 Provider 健康状态。
  - 连续失败达到阈值后开路（Open）。
  - 开路窗口内直接跳过该 Provider。
  - 一次成功调用即可重置失败计数。

## 4. 错误策略
- 可重试错误：
  - `rate_limit`（`429`）
  - `server`（`5xx`）
  - `timeout`（`AbortError`）
  - `network`（`TypeError` 及类似传输错误）
- 不可重试错误：
  - `bad_request`（除 `429` 外的 `4xx`）
  - `auth`（`401/403`）
- 统一错误模型 `LLMError` 字段：
  - `provider`、`statusCode`、`code`、`retryAfterMs`、`cause`

## 5. 默认参数
- `LLM_TIMEOUT_MS=12000`
- `LLM_MAX_RETRIES=3`
- `LLM_BASE_DELAY_MS=400`
- `LLM_MAX_DELAY_MS=4000`
- `LLM_JITTER_RATIO=0.2`
- `LLM_CIRCUIT_FAILURE_THRESHOLD=3`
- `LLM_CIRCUIT_OPEN_MS=30000`
- `LLM_PROVIDER=qwen|mock`
- `LLM_FALLBACK_PROVIDER=mock|qwen`

## 6. 可观测性
- 当前已具备日志：
  - 重试日志（Provider、重试次数、退避时长、错误原因）
  - 降级日志（从哪个 Provider 切到哪个 Provider）
- 建议下一步接入指标：
  - `success_rate`
  - `retry_count`
  - `fallback_count`
  - `latency_p95`

## 7. 上线步骤
1. 在预发环境开启 `LLM_FALLBACK_PROVIDER=mock`。
2. 通过注入超时和 `429` 场景验证重试/降级路径。
3. 根据预发数据调优重试与熔断阈值。
4. 生产发布并配置告警阈值：
   - 降级比例 > 5%
   - 超时比例 > 3%
   - 全 Provider 失败比例 > 1%

## 8. 风险与边界
- 熔断状态为进程内内存态，多实例之间不共享。
- 主备模型能力可能不一致，存在输出质量与格式漂移风险。
- 重试会提升尾延迟，需在成功率和时延间平衡参数。
