# API 接口文档

本文档描述 AI Efficiency Studio 的所有 API 端点。

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **认证**: 部分接口需要 NextAuth.js 会话认证

---

## 任务执行

### POST /api/run

执行任务规划与运行的主入口。

**请求体**:

```json
{
  "input": "帮我搜索最新的 AI 技术趋势",
  "uuid": "user123:default:550e8400-e29b-41d4-a716-446655440000",
  "plugins": ["plan-execute", "wbs"]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | string | 是 | 用户输入的自然语言需求 |
| `uuid` | string | 是 | 会话 ID |
| `plugins` | string[] | 否 | 要运行的插件列表，默认 `["plan-execute"]` |

**响应**:

```json
{
  "plan": {
    "goal": "搜索最新的 AI 技术趋势",
    "steps": [
      { "action": "web.search", "params": { "query": "AI 技术趋势 2024", "limit": 5 } },
      { "action": "emit", "params": { "data": { "content": "..." } } }
    ],
    "meta": {
      "id": "plan-uuid",
      "model": "qwen",
      "created": 1704067200000
    }
  },
  "observation": {
    "emits": [
      { "content": "...", "at": "2024-01-01T00:00:00.000Z" }
    ]
  },
  "results": [
    { "stepIndex": 0, "type": "web.search", "ok": true, "data": { "items": [...] } }
  ],
  "outputs": [
    { "type": "emit", "payload": { "content": "..." } }
  ],
  "plugins": [
    { "name": "plan-execute", "ok": true, "data": {...} }
  ],
  "sessionId": "user123:default:550e8400-e29b-41d4-a716-446655440000"
}
```

**错误响应**:

| 状态码 | 说明 |
|--------|------|
| 400 | 输入被安全检测拦截 |
| 500 | 计划生成或执行失败 |

**示例**:

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{"input":"搜索 AI 新闻","uuid":"user1:default:abc123"}'
```

---

## 计划生成

### POST /api/plan

仅生成执行计划，不执行。

**请求体**:

```json
{
  "input": "帮我分析竞品的市场策略",
  "uuid": "user123:default:550e8400-e29b-41d4-a716-446655440000"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | string | 是 | 用户输入 |
| `uuid` | string | 是 | 会话 ID |

**响应**:

```json
{
  "goal": "分析竞品的市场策略",
  "steps": [
    { "action": "web.search", "params": { "query": "竞品 市场策略", "limit": 5 } },
    { "action": "web.fetch", "params": { "url": "https://..." } },
    { "action": "emit", "params": { "data": { "content": "..." } } }
  ],
  "meta": {
    "id": "plan-uuid",
    "model": "qwen",
    "created": 1704067200000
  }
}
```

**示例**:

```bash
curl -X POST http://localhost:3000/api/plan \
  -H "Content-Type: application/json" \
  -d '{"input":"分析市场趋势","uuid":"user1:default:abc123"}'
```

---

## 会话管理

### POST /api/session

创建新会话。

**请求体**:

```json
{
  "userId": "user123",
  "scope": "default"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 用户 ID |
| `scope` | string | 是 | 会话作用域 |

**响应**:

```json
{
  "sessionId": "user123:default:550e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1704067200000
}
```

---

### GET /api/session

获取用户的会话列表。

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 用户 ID |
| `scope` | string | 否 | 过滤指定作用域 |

**响应**:

```json
{
  "sessions": [
    {
      "sessionId": "user123:default:abc123",
      "summary": "搜索 AI 技术趋势",
      "createdAt": 1704067200000,
      "updatedAt": 1704153600000
    }
  ]
}
```

**示例**:

```bash
curl "http://localhost:3000/api/session?userId=user123"
```

---

### GET /api/session/[id]

获取指定会话详情。

**路径参数**:

| 参数 | 说明 |
|------|------|
| `id` | 会话 ID |

**响应**:

```json
{
  "sessionId": "user123:default:abc123",
  "summary": "搜索 AI 技术趋势",
  "history": [
    { "role": "user", "content": "搜索 AI 新闻" },
    { "role": "assistant", "content": "..." }
  ],
  "plan": { ... },
  "results": [ ... ],
  "outputs": [ ... ],
  "createdAt": 1704067200000,
  "updatedAt": 1704153600000
}
```

---

### POST /api/session/save

保存会话状态。

**请求体**:

```json
{
  "sessionId": "user123:default:abc123",
  "state": {
    "summary": "更新后的摘要",
    "history": [...],
    "plan": {...}
  }
}
```

**响应**:

```json
{
  "ok": true,
  "updatedAt": 1704153600000
}
```

---

## 插件接口

### POST /api/wbs

生成工作分解结构（WBS）图。

**请求体**:

```json
{
  "input": "开发一个电商平台",
  "uuid": "user123:default:abc123"
}
```

**响应**:

```json
{
  "name": "wbs",
  "ok": true,
  "data": {
    "version": "wbs.v1",
    "goal": "开发电商平台",
    "nodes": [
      { "id": "1", "title": "需求分析", "type": "milestone", "status": "todo", "parentId": null, "dependsOn": [], "notes": [] },
      { "id": "2", "title": "用户模块", "type": "task", "status": "todo", "parentId": "1", "dependsOn": [], "notes": [] }
    ],
    "edges": [
      { "from": "1", "to": "2", "type": "parent" }
    ],
    "updates": {
      "addedNodeIds": ["1", "2"],
      "updatedNodeIds": [],
      "removedNodeIds": []
    }
  }
}
```

---

### POST /api/taskFlow

生成任务流程图。

**请求体**:

```json
{
  "input": "用户注册流程",
  "uuid": "user123:default:abc123"
}
```

**响应**:

```json
{
  "name": "tf",
  "ok": true,
  "data": {
    "version": "flowchart.v1",
    "title": "用户注册流程",
    "nodes": [
      { "id": "start", "label": "开始", "type": "start", "status": "done" },
      { "id": "input", "label": "填写信息", "type": "task", "status": "todo" },
      { "id": "end", "label": "完成", "type": "end", "status": "todo" }
    ],
    "edges": [
      { "from": "start", "to": "input", "type": "sequence" },
      { "from": "input", "to": "end", "type": "sequence" }
    ],
    "updates": { ... }
  }
}
```

---

## 产物管理

### GET /api/artifacts

获取用户的产物列表。

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | 是 | 用户 ID |

**响应**:

```json
{
  "artifacts": [
    {
      "id": "artifact-uuid",
      "path": "public/exports/report.pdf",
      "url": "/exports/report.pdf",
      "filename": "report.pdf",
      "kind": "pdf",
      "size": 102400,
      "createdAt": 1704067200000
    }
  ]
}
```

---

## 用户管理

### POST /api/user/register

注册新用户。

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "用户名"
}
```

**响应**:

```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "tokenQuota": 50000
}
```

---

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "error": "错误描述信息"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误或安全拦截 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 安全拦截错误

当请求被安全系统拦截时，返回 400 状态码，错误信息包含拦截原因：

```json
{
  "error": "安全限制：我不能协助执行可能破坏系统的操作。"
}
```

---

## TypeScript 类型定义

```typescript
// 请求类型
interface RunRequest {
  input: string;
  uuid: string;
  plugins?: string[];
}

interface PlanRequest {
  input: string;
  uuid: string;
}

interface CreateSessionRequest {
  userId: string;
  scope: string;
}

// 响应类型
interface Plan {
  goal: string;
  steps: PlanStep[];
  meta?: {
    id: string;
    model: string;
    created: number;
  };
  directResponse?: string;
}

interface PlanStep {
  action: ActionType;
  params: Record<string, unknown>;
  id?: string;
  dependsOn?: string[];
}

type ActionType =
  | 'log'
  | 'emit'
  | 'http'
  | 'export_flow'
  | 'web.search'
  | 'web.fetch'
  | 'file.write'
  | 'artifact.export';

interface ExecutionResult {
  stepIndex: number;
  type: string;
  ok: boolean;
  fatal?: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
}

interface OutputItem {
  type: string;
  payload: unknown;
}

interface PluginResult<T = unknown> {
  name: string;
  ok: boolean;
  data?: T;
  error?: string;
}
```