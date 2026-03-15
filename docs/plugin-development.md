# 插件开发指南

本文档介绍如何为 AI Efficiency Studio 开发自定义插件。

## 插件系统概述

插件系统允许开发者扩展系统的核心功能，无需修改主代码库。每个插件接收用户输入和会话状态，返回结构化结果。

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Plugin Runner                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  for each plugin: plugin.run(input, state)      │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│         ┌────────────────┼────────────────┐            │
│         ▼                ▼                ▼            │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐      │
│  │ Plugin A  │    │ Plugin B  │    │ Plugin C  │      │
│  │ (WBS)     │    │ (TaskFlow)│    │ (Custom)  │      │
│  └───────────┘    └───────────┘    └───────────┘      │
└─────────────────────────────────────────────────────────┘
```

## 插件接口

### 核心类型定义

```typescript
// core/plugins/types.ts

/**
 * 插件结果
 */
export type PluginResult<T = unknown> = {
  name: string;
  ok: boolean;
  data?: T;
  error?: string;
};

/**
 * 插件接口
 */
export interface Plugin<T = unknown> {
  /** 插件名称（唯一标识） */
  name: string;

  /**
   * 运行插件
   * @param input - 用户输入
   * @param state - 会话状态
   * @returns 插件执行结果
   */
  run(input: string, state: SessionState): Promise<PluginResult<T>>;
}
```

### 会话状态

```typescript
interface SessionState {
  sessionId: string;           // 会话 ID
  summary: string;             // 长期摘要
  history: Message[];          // 对话历史
  observation?: {              // 观察数据
    emits: Array<{ content: string; at: string }>;
  };
  wbs?: WbsGraph;              // WBS 数据
  flowchart?: FlowchartJson;   // 流程图数据
  policyContext?: PolicyContext;  // 策略上下文
  plan?: Plan | null;          // 当前计划
  results?: ExecutionResult[]; // 执行结果
  outputs?: OutputItem[];      // 输出内容
  createdAt: number;
  updatedAt: number;
}
```

## 创建自定义插件

### 步骤 1: 创建插件文件

在 `core/plugins/` 目录下创建新文件夹：

```
core/plugins/
├── myPlugin/
│   ├── index.ts      # 插件入口
│   ├── schema.ts     # Zod Schema（可选）
│   └── prompt.ts     # Prompt 模板（可选）
```

### 步骤 2: 实现插件接口

```typescript
// core/plugins/myPlugin/index.ts

import 'server-only';
import { callLLM } from '@/core/llm';
import { clampMessagesToBudget } from '@/core/llm/estimateToken';
import type { SessionState } from '@/core/types';
import type { PluginResult } from '../types';
import { MyPluginSchema, type MyPluginOutput } from './schema';
import { myPluginPrompt } from './prompt';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1200;

/**
 * 我的自定义插件
 */
export async function runMyPlugin(
  input: string,
  state: SessionState,
): Promise<PluginResult<MyPluginOutput>> {
  // 1. 构建 Prompt
  let context = myPluginPrompt(input, state);

  // 2. Token 预算控制
  context = clampMessagesToBudget(context, MAX_PROMPT_TOKENS - RESERVED_OUTPUT);

  // 3. 调用 LLM
  const rawText = await callLLM(context);

  // 4. 解析响应
  let json: unknown;
  try {
    json = JSON.parse(rawText.content);
  } catch {
    return {
      name: 'my-plugin',
      ok: false,
      error: 'Plugin must return valid JSON',
    };
  }

  // 5. Schema 验证
  const parsed = MyPluginSchema.safeParse(json);
  if (!parsed.success) {
    return {
      name: 'my-plugin',
      ok: false,
      error: `Invalid output: ${parsed.error.message}`,
    };
  }

  // 6. 更新会话状态（可选）
  // state.myData = parsed.data;

  return {
    name: 'my-plugin',
    ok: true,
    data: parsed.data,
  };
}
```

### 步骤 3: 定义 Schema（可选但推荐）

```typescript
// core/plugins/myPlugin/schema.ts

import { z } from 'zod';

export const MyPluginSchema = z.object({
  title: z.string(),
  items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.number(),
  })),
  metadata: z.object({
    generatedAt: z.number(),
    model: z.string(),
  }).optional(),
});

export type MyPluginOutput = z.infer<typeof MyPluginSchema>;
```

### 步骤 4: 创建 Prompt 模板

```typescript
// core/plugins/myPlugin/prompt.ts

import type { Message } from '@/core/types';
import type { SessionState } from '@/core/types';

export function myPluginPrompt(input: string, state: SessionState): Message[] {
  const systemPrompt = `你是一个专业的数据分析师。
根据用户的需求，生成结构化的分析结果。

输出格式要求：
- 必须返回有效的 JSON
- 遵循指定的 Schema 结构

示例输出：
{
  "title": "分析报告标题",
  "items": [
    { "id": "1", "label": "项目A", "value": 100 },
    { "id": "2", "label": "项目B", "value": 200 }
  ]
}`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
  ];

  // 添加历史上下文
  if (state.summary) {
    messages.push({
      role: 'system',
      content: `对话摘要：${state.summary}`,
    });
  }

  // 添加用户输入
  messages.push({ role: 'user', content: input });

  return messages;
}
```

### 步骤 5: 注册插件

```typescript
// core/plugins/index.ts

import type { Plugin } from './types';
import { runWbsPlugin } from './wbs';
import { runTaskFlowPlugin } from './taskFlow';
import { runPlanExecutePlugin } from './planExecute';
import { runMyPlugin } from './myPlugin';  // 导入新插件

export const wbsPlugin: Plugin = {
  name: 'wbs',
  run: runWbsPlugin,
};

export const planExecutePlugin: Plugin = {
  name: 'plan-execute',
  run: runPlanExecutePlugin,
};

export const taskFlowPlugin: Plugin = {
  name: 'tf',
  run: runTaskFlowPlugin,
};

// 注册新插件
export const myPlugin: Plugin = {
  name: 'my-plugin',
  run: runMyPlugin,
};
```

### 步骤 6: 在 API 中启用

```typescript
// app/api/run/route.ts

import { planExecutePlugin, wbsPlugin, myPlugin } from '@/core/plugins';

// 在 pluginList 中添加
const pluginList = [
  requested.includes('plan-execute') ? planExecutePlugin : null,
  requested.includes('wbs') ? wbsPlugin : null,
  requested.includes('my-plugin') ? myPlugin : null,  // 添加这行
].filter(Boolean) as typeof planExecutePlugin[];
```

## 内置插件示例

### WBS 插件

生成工作分解结构图：

```typescript
// 输入
"开发一个电商平台"

// 输出
{
  version: 'wbs.v1',
  goal: '开发电商平台',
  nodes: [
    { id: '1', title: '需求分析', type: 'milestone', status: 'todo', ... },
    { id: '2', title: '用户模块', type: 'task', status: 'todo', ... },
  ],
  edges: [
    { from: '1', to: '2', type: 'parent' },
  ],
}
```

### TaskFlow 插件

生成任务流程图：

```typescript
// 输入
"用户注册流程"

// 输出
{
  version: 'flowchart.v1',
  title: '用户注册流程',
  nodes: [
    { id: 'start', label: '开始', type: 'start', status: 'done' },
    { id: 'input', label: '填写信息', type: 'task', status: 'todo' },
    { id: 'end', label: '完成', type: 'end', status: 'todo' },
  ],
  edges: [
    { from: 'start', to: 'input', type: 'sequence' },
  ],
}
```

### PlanExecute 插件

规划并执行任务：

```typescript
// 流程
1. 调用 Planner 生成计划
2. 执行 PlanGuard 安全检查
3. 调用 Executor 执行任务
4. 返回结果

// 输出
{
  plan: { goal, steps, meta },
  results: [ { stepIndex, type, ok, data, error } ],
  outputs: [ { type, payload } ],
}
```

## 最佳实践

### 1. 错误处理

```typescript
export async function runMyPlugin(
  input: string,
  state: SessionState,
): Promise<PluginResult<MyPluginOutput>> {
  try {
    // 插件逻辑
  } catch (error) {
    return {
      name: 'my-plugin',
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### 2. Token 预算控制

```typescript
import { clampMessagesToBudget } from '@/core/llm/estimateToken';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1200;

// 确保不超过 LLM 上下文限制
context = clampMessagesToBudget(context, MAX_PROMPT_TOKENS - RESERVED_OUTPUT);
```

### 3. Schema 验证

始终使用 Zod 验证 LLM 输出：

```typescript
const parsed = MyPluginSchema.safeParse(json);
if (!parsed.success) {
  return {
    name: 'my-plugin',
    ok: false,
    error: `Invalid output: ${parsed.error.message}`,
  };
}
```

### 4. 会话状态更新

谨慎更新会话状态，避免污染：

```typescript
// 好的做法：使用专用字段
state.myPluginData = parsed.data;

// 避免：直接覆盖核心字段
// state.history = ...  // 不要这样做
```

### 5. 服务端限制

确保插件代码只在服务端运行：

```typescript
import 'server-only';  // 添加在文件顶部
```

## 创建 API 端点（可选）

如果需要独立的 API 端点：

```typescript
// app/api/myPlugin/route.ts

import { NextResponse } from 'next/server';
import { initLLMOnce } from '@/core/llm/init';
import { getSession } from '@/core/storage/storageMap/map';
import { runMyPlugin } from '@/core/plugins/myPlugin';

export async function POST(req: Request) {
  initLLMOnce();

  const { input, uuid } = await req.json();

  if (!input || !uuid) {
    return NextResponse.json(
      { error: 'input and uuid are required' },
      { status: 400 },
    );
  }

  const state = await getSession(uuid);
  const result = await runMyPlugin(input, state);

  return NextResponse.json(result);
}
```

## 测试插件

```typescript
// test/plugins/myPlugin.test.ts

import { describe, it, expect } from 'vitest';
import { runMyPlugin } from '@/core/plugins/myPlugin';

describe('MyPlugin', () => {
  it('should return valid output', async () => {
    const state = {
      sessionId: 'test:default:123',
      summary: '',
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = await runMyPlugin('测试输入', state);

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## 调试技巧

### 1. 启用详细日志

```typescript
console.log('[MyPlugin] input:', input);
console.log('[MyPlugin] raw response:', rawText.content);
console.log('[MyPlugin] parsed:', parsed.data);
```

### 2. 使用 Mock Provider 测试

```env
LLM_PROVIDER=mock
```

### 3. 检查 Token 使用

```typescript
import { estimateMessagesTokens } from '@/core/llm/estimateToken';

const tokens = estimateMessagesTokens(context);
console.log('[MyPlugin] estimated tokens:', tokens);
```