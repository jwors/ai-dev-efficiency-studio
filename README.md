# AI Efficiency Studio

以 AI 为 Planner、以程序为 Executor 的开发效率工具，将自然语言需求转化为可重复、可审计的工程执行流程。

## 核心理念

```
用户输入 → Planner（AI 规划）→ Task Graph（结构化任务）→ Executor（程序执行）→ 结果/日志/状态
```

传统的 AI 对话只是"回答问题"，而 AI Efficiency Studio 实现"交付结果"——通过结构化的任务规划和执行，将模糊需求转化为可追踪的工程产出。

## 功能特性

### 核心能力

- **智能规划** - AI 自动将自然语言需求分解为结构化的执行步骤
- **可靠执行** - 按序执行任务，支持结果收集和错误处理
- **会话管理** - 历史记录保存、对话摘要、上下文窗口管理
- **安全防护** - 多层输入检测、逐步式攻击识别、策略拦截

### 高级特性

- **Token 预算控制** - 可配置的 Token 配额和使用追踪
- **产物系统** - 执行结果持久化存储，支持文件导出
- **插件生态** - 可扩展的插件架构（WBS、TaskFlow、PlanExecute）
- **LLM 容错** - 内置重试机制、熔断降级、多提供者支持

## 系统架构

```
core/
├── config/          # 系统配置
├── llm/             # 模型适配层（重试、熔断、降级）
├── planner/         # AI 决策引擎
├── task/            # 任务类型定义
├── executor/        # 任务执行器
├── security/        # 安全防护（输入检测、策略拦截）
├── plugins/         # 插件系统
│   ├── wbs/         # 工作分解结构插件
│   ├── taskFlow/    # 任务流程图插件
│   └── planExecute/ # 计划执行插件
├── session/         # 会话管理
├── artifacts/       # 产物存储
└── prompts/         # Prompt 模板
```

## 任务类型

支持以下内置任务类型：

| 任务类型 | 说明 |
|---------|------|
| `log` | 日志输出 |
| `emit` | 内容生成 |
| `http` | HTTP 请求 |
| `web.search` | 网络搜索 |
| `web.fetch` | 网页抓取 |
| `file.write` | 文件写入 |
| `export_flow` | 流程图导出 |
| `artifact.export` | 产物导出 |

## 技术栈

- **框架**: Next.js 16 + React 19
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: NextAuth.js
- **UI**: Ant Design + Tailwind CSS
- **验证**: Zod
- **可视化**: @xyflow/react + Mermaid

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- pnpm / npm / yarn

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd ai-efficiency-studio

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和 LLM API 密钥

# 初始化数据库
pnpm prisma migrate dev

# 启动开发服务器
pnpm dev
```

### 环境变量

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/ai_efficiency"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# LLM Provider
LLM_API_KEY="your-api-key"
LLM_API_BASE="https://api.example.com/v1"
LLM_MODEL="gpt-4"
```

## 安全机制

### 输入防护

- **高风险模式拦截** - 系统破坏、数据窃取、网络攻击、恶意软件等
- **可疑关键词检测** - 识别潜在风险请求
- **多轮上下文分析** - 检测逐步式攻击行为
- **风险评分系统** - 加权衰减算法计算综合风险

### Token 预算

- 用户级 Token 配额管理
- 请求级预算检查
- 使用量追踪与退款机制

## 插件系统

### 内置插件

1. **WBS Plugin** - 工作分解结构，生成层次化任务树
2. **TaskFlow Plugin** - 任务流程图，可视化执行依赖
3. **PlanExecute Plugin** - 计划执行器，端到端任务运行

### 扩展插件

```typescript
// core/plugins/types.ts
interface Plugin {
  name: string;
  run: (input: PluginInput) => Promise<PluginOutput>;
}
```

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/run` | POST | 执行任务 |
| `/api/plan` | POST | 生成计划 |
| `/api/session` | GET | 获取会话列表 |
| `/api/session/save` | POST | 保存会话 |
| `/api/artifacts` | GET | 获取产物列表 |
| `/api/wbs` | POST | WBS 插件 |
| `/api/taskFlow` | POST | TaskFlow 插件 |

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 开发路线

### 已完成

- [x] History 保存上下文
- [x] Summary 生成对话摘要
- [x] 会话窗口管理
- [x] ObservationDigest 实现
- [x] 安全词检测
- [x] 数据持久化
- [x] 插件系统
- [x] 页面状态恢复

### 计划中

- [ ] 可审计报告（来源与证据链）
- [ ] 任务产物系统升级
- [ ] 可复用模板库
- [ ] 任务回放与差异对比
- [ ] 可控执行预算

## 许可证

MIT License