# 系统架构

本文档详细介绍 AI Efficiency Studio 的系统架构设计和核心模块。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              用户界面层                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   主页面    │  │  WBS 页面   │  │ TaskFlow    │  │  登录/注册  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API 路由层                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  /api/run   │  │ /api/plan   │  │/api/session │  │  /api/wbs   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              核心业务层                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Security（安全防护）                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │  InputGuard  │  │  PlanGuard   │  │  PolicyGuard │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  ┌─────────────┐  ┌─────────────┐  ▼  ┌─────────────┐  ┌───────────┐  │
│  │   Planner   │──│   Executor  │────│  Session    │  │  Artifacts│  │
│  │  (规划器)   │  │  (执行器)   │    │  (会话管理) │  │  (产物)   │  │
│  └─────────────┘  └─────────────┘    └─────────────┘  └───────────┘  │
│         │                │                                              │
│         ▼                ▼                                              │
│  ┌─────────────┐  ┌─────────────┐                                      │
│  │   Plugins   │  │    LLM      │                                      │
│  │  (插件系统) │  │ (模型适配层) │                                      │
│  └─────────────┘  └─────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              数据持久层                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │  PostgreSQL │  │   Prisma    │  │ 文件系统    │                     │
│  │  (数据库)   │  │   (ORM)     │  │ (产物存储)  │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

## 核心数据流

```
用户输入 → [安全检测] → [Planner 规划] → [Plan 安全检查] → [Executor 执行] → 结果输出
                │              │                │                │
                ▼              ▼                ▼                ▼
           InputGuard     Token 预算       PlanGuard        PolicyGuard
           风险评分       上下文管理       任务安全检测      执行策略控制
```

## 目录结构

```
core/
├── config/              # 系统配置
│   └── index.ts         # 环境变量解析、全局配置对象
│
├── llm/                 # LLM 适配层
│   ├── index.ts         # 统一调用入口（callLLM）
│   ├── init.ts          # 提供者初始化
│   ├── retry.ts         # 指数退避重试策略
│   ├── fallback.ts      # 熔断降级策略
│   ├── error.ts         # 错误归一化
│   ├── tokenBudget.ts   # Token 预算控制
│   ├── estimateToken.ts # Token 估算
│   └── providers/       # 提供者实现
│       ├── qwen.ts      # 通义千问
│       └── mock.ts      # 测试模拟
│
├── planner/             # AI 规划引擎
│   ├── planner.ts       # 规划主逻辑
│   ├── schema.ts        # Plan Zod Schema
│   └── sanitize.ts      # 输出清洗
│
├── executor/            # 任务执行器
│   ├── index.ts         # 任务分发执行
│   ├── runPlan.ts       # 计划运行器
│   └── fileSystem.ts    # 文件系统操作
│
├── security/            # 安全防护
│   ├── inputGuard.ts    # 输入安全检测
│   ├── planGuard.ts     # 计划安全检查
│   └── policyGuard.ts   # 执行策略控制
│
├── plugins/             # 插件系统
│   ├── types.ts         # 插件接口定义
│   ├── index.ts         # 插件注册导出
│   ├── runPlugins.ts    # 插件运行器
│   ├── wbs/             # WBS 插件
│   ├── taskFlow/        # TaskFlow 插件
│   └── planExecute/     # PlanExecute 插件
│
├── session/             # 会话管理
│   ├── index.ts         # 会话更新逻辑
│   └── manager.ts       # 会话状态管理
│
├── artifacts/           # 产物存储
│   └── store.ts         # 产物持久化
│
├── prompts/             # Prompt 模板
│   ├── plannerPrompt.ts # 规划器 Prompt
│   ├── wbsPrompt.ts     # WBS Prompt
│   └── taskFlowPrompt.ts# TaskFlow Prompt
│
├── task/                # 任务类型
│   ├── types.ts         # 任务类型定义
│   └── fromPlan.ts      # Plan → Task 转换
│
└── types/               # 类型定义
    ├── index.ts         # 统一导出
    ├── session.ts       # 会话相关类型
    └── audit.ts         # 审计相关类型
```

## 核心模块详解

### 1. Planner（规划器）

**职责**: 将自然语言需求转换为结构化执行计划

**核心流程**:
1. Token 预算检查
2. 更新会话摘要
3. 构建 Prompt 上下文
4. 调用 LLM 生成计划
5. Zod Schema 验证

**输出结构**:
```typescript
interface Plan {
  goal: string;        // 目标描述
  steps: PlanStep[];   // 执行步骤
  meta?: {
    id: string;        // 计划 ID
    model: string;     // 使用的模型
    created: number;   // 创建时间戳
  };
  directResponse?: string;  // LLM 直接响应（非 JSON）
}

interface PlanStep {
  action: ActionType;           // 动作类型
  params: Record<string, unknown>;  // 参数
  id?: string;                  // 步骤 ID
  dependsOn?: string[];         // 依赖步骤
}
```

### 2. Executor（执行器）

**职责**: 按计划顺序执行任务，收集结果

**支持的任务类型**:

| 类型 | 说明 | 参数 |
|------|------|------|
| `log` | 日志输出 | `message` |
| `emit` | 内容生成 | `data.content` |
| `http` | HTTP 请求 | `url`, `method`, `headers`, `body` |
| `web.search` | 网络搜索 | `query`, `limit` |
| `web.fetch` | 网页抓取 | `url` |
| `file.write` | 文件写入 | `path`, `content` |
| `artifact.export` | 产物导出 | `path`, `filename` |
| `export_flow` | 流程图导出 | `format`, `filename` |

**执行流程**:
```
Task → PolicyGuard 安全检查 → 执行具体操作 → 收集结果/输出
```

### 3. LLM 适配层

**职责**: 统一 LLM 调用接口，提供重试、熔断、降级能力

**架构设计**:
```
callLLM() → withFallback() → withRetry() → Provider.call()
                │                  │
                ▼                  ▼
           熔断器状态        指数退避 + 抖动
```

**特性**:
- **重试策略**: 指数退避 + 抖动，避免惊群效应
- **熔断机制**: 连续失败后开路，保护下游服务
- **降级策略**: 主 Provider 失败后自动切换备用
- **错误归一化**: 统一错误模型 `LLMError`

### 4. Security（安全防护）

**三层防护架构**:

| 层级 | 模块 | 检测内容 |
|------|------|----------|
| 输入层 | InputGuard | 高风险模式、可疑关键词、多轮上下文风险 |
| 计划层 | PlanGuard | 危险搜索查询、敏感文件路径、内网访问 |
| 执行层 | PolicyGuard | URL 白名单、HTTPS 强制、内网 IP 拦截 |

**风险评分算法**:
```typescript
totalRisk = currentRisk * 0.78 + historyRisk * 0.22 + stepRisk - recoveryBonus
```

- `currentRisk`: 当前输入风险评分
- `historyRisk`: 历史风险加权衰减评分
- `stepRisk`: 逐步式攻击风险
- `recoveryBonus`: 连续安全对话奖励

### 5. Plugins（插件系统）

**插件接口**:
```typescript
interface Plugin<T = unknown> {
  name: string;
  run(input: string, state: SessionState): Promise<PluginResult<T>>;
}

interface PluginResult<T = unknown> {
  name: string;
  ok: boolean;
  data?: T;
  error?: string;
}
```

**内置插件**:

| 插件 | 功能 | 输出 |
|------|------|------|
| `plan-execute` | 规划并执行任务 | Plan + Results + Outputs |
| `wbs` | 工作分解结构 | WbsGraph（层次化任务树） |
| `tf` | 任务流程图 | FlowchartGraph（执行依赖图） |

### 6. Session（会话管理）

**会话状态结构**:
```typescript
interface SessionState {
  sessionId: string;           // 会话 ID（格式：userId:scope:uuid）
  summary: string;             // 长期摘要
  history: Message[];          // 最近对话（滚动窗口）
  observation?: {              // 观察数据
    emits: Array<{ content: string; at: string }>;
  };
  wbs?: WbsGraph;              // WBS 图数据
  flowchart?: FlowchartJson;   // 流程图数据
  policyContext?: PolicyContext;  // 安全策略上下文
  plan?: Plan | null;          // 当前计划
  results?: ExecutionResult[]; // 执行结果
  outputs?: OutputItem[];      // 输出内容
  createdAt: number;
  updatedAt: number;
}
```

**上下文窗口管理**:
- History 滚动窗口保留最近对话
- Summary 长期摘要压缩历史信息
- Token 预算控制总上下文大小

## 技术选型

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | Next.js 16 | 全栈框架 |
| UI 库 | React 19 | 组件化开发 |
| 样式 | Tailwind CSS + Ant Design | UI 组件和样式 |
| 数据库 | PostgreSQL | 数据持久化 |
| ORM | Prisma | 数据库访问 |
| 认证 | NextAuth.js | 用户认证 |
| 验证 | Zod | Schema 验证 |
| 可视化 | @xyflow/react + Mermaid | 图表渲染 |

## 扩展点

### 添加新任务类型

1. 在 `core/llm/types.ts` 的 `Action` 枚举中添加类型
2. 在 `core/executor/index.ts` 的 `switch` 中添加处理逻辑
3. 在 `core/security/policyGuard.ts` 中添加安全策略（如需要）

### 添加新 LLM 提供者

1. 实现 `LLMProvider` 接口
2. 在 `core/llm/init.ts` 中注册提供者
3. 配置环境变量

### 添加新插件

1. 实现 `Plugin` 接口
2. 在 `core/plugins/index.ts` 中导出
3. 在 API 路由中注册