# 架构规划插件可行性报告

## 更新说明（基于当前代码复评，2026-03-23）

本报告最初从”新插件规划”角度出发，但结合当前仓库实现，`architect` 插件已经完成了 MVP 级落地，以下结论应作为阅读本报告的前置说明：

1. **”架构图生成插件”本身已可行且已实现**
   - 当前仓库已经具备完整链路：`architect` 插件、`/api/architect` 路由、页面入口、架构图可视化组件、会话态保存、Schema 校验与输出归一化。
   - 因此，报告中”开发一个新插件”的表述已经过时，更准确的说法应为：**现有插件已完成基础落地，后续重点是增强与整合**。

2. **当前真实能力范围：已完成架构生成、展示与完整编辑功能**
   - 已完成：
     - 根据需求生成 `ArchitectureJson`
     - 输出组件、连接、技术栈、关键决策
     - React Flow 可视化展示
     - architect 页面已集成只读 WBS 视图与流程视图（通过 adapter 驱动现有组件）
     - 导出 PNG、复制 JSON
     - 基于会话上下文做增量更新
     - **编辑模式框架（Phase 2.1 已完成）**
       - 编辑/保存/取消流程
       - 节点拖拽
       - 变更追踪
     - **节点编辑（Phase 2.2 已完成）**
       - 双击节点编辑名称
       - 右键菜单删除节点
       - 新增节点表单
     - **连线编辑（Phase 2.3 已完成）**
       - 从节点 Handle 拖出创建新连线
       - 点击选中连线 + Delete/Backspace 删除
       - 右键菜单删除连线
       - 连线类型选择（http、websocket、grpc 等）
   - 未完成：
     - 与 WBS / TaskFlow 的统一 `ArchitectGraph` 模型
     - 原生任务语义建模（当前仅完成只读视图投影，不复用 plugin 逻辑）
     - 编辑结果持久化与冲突处理

3. **报告中的”高复用”判断基本成立，但”直接复用”表述偏乐观**
   - `@xyflow/react`、LLM 封装、Zod 校验、会话管理等基础设施确实可复用。
   - 但 WBS 与 TaskFlow 当前仍是独立插件，若要形成统一的”架构 + 任务 + 流程”一体化图模型，属于新增一层编排，不是简单拼接已有代码。

4. **工期评估需要按目标拆分**
   - 若目标仅为”架构图生成插件 MVP”，该目标实际上已经完成。
   - 若目标是报告中描述的完整形态，即”统一模型 + 任务拆解 + 流程图联动 + 在线编辑”，则 `13-18` 天偏乐观，更合理的预期应按 3 个阶段推进：
     - Phase A：稳定现有架构插件输出质量
     - Phase B：打通任务拆解 / 流程联动
     - Phase C：补齐在线编辑、持久化和冲突处理

5. **更新后的总体结论**
   - **架构图插件 MVP：高可行，且已落地**
   - **完整 Architect 平台形态：中高可行，但需要追加建模与前端交互成本**
   - 建议实施顺序调整为：
     1. 先把现有 `architect` 插件定义为已上线 MVP
     2. 再评估是否需要统一 `ArchitectGraph`
     3. 最后再做在线编辑，而不是提前为编辑能力设计过重的数据同步方案

## 一、需求概述

开发一个新插件，用户输入需求描述（如"搭建后台管理系统"），系统自动：

1. **生成架构设计** - 输出系统架构、技术选型、模块划分
2. **任务分解** - 将需求拆分为可执行的任务列表
3. **任务流程图** - 可视化任务执行流程
4. **架构流程图** - 可视化系统架构与数据流
5. **在线编辑** - 支持用户直接修改图表内容

---

## 二、现有系统能力分析

### 2.1 已有基础设施

| 组件 | 现状 | 复用价值 |
|------|------|----------|
| WBS Plugin | 任务分解、层次化节点、依赖关系 | ⭐⭐ 谨慎复用，优先参考组件接口 |
| TaskFlow Plugin | 流程图生成、节点状态管理 | ⭐⭐ 谨慎复用，优先参考组件接口 |
| @xyflow/react | 可视化渲染、拖拽、导出 | ⭐⭐⭐⭐⭐ 高度复用 |
| LLM 集成 | 结构化 JSON 输出、Token 预算控制 | ⭐⭐⭐⭐⭐ 高度复用 |
| Zod Schema | 输出验证、类型安全 | ⭐⭐⭐⭐⭐ 高度复用 |
| 会话状态 | 历史上下文、增量更新 | ⭐⭐⭐⭐ 良好复用 |

### 2.2 现有架构优势

```
用户输入 → Planner(AI规划) → Task Graph(结构化任务) → Executor(程序执行) → 结果/日志/状态
```

项目核心架构天然支持"规划-执行"模式，与需求高度契合。

### 2.3 关键代码位置

```
core/
├── plugins/
│   ├── wbs/           # 任务分解参考实现
│   ├── taskFlow/      # 流程图参考实现
│   └── types.ts       # 插件接口定义
├── prompts/
│   ├── wbsPrompt.ts   # Prompt 模板参考
│   └── taskFlowPrompt.ts
└── llm/
    └── index.ts       # LLM 调用封装

app/components/
├── Wbs.tsx            # WBS 可视化组件
└── taskFlow.tsx       # 流程图可视化组件
```

---

## 三、可行性评估

### 3.1 功能拆解与可行性评分

| 功能 | 技术难度 | 工作量 | 可行性 | 备注 |
|------|----------|--------|--------|------|
| 架构设计生成 | 中 | 2天 | ✅ 高 | 复用现有 Prompt 模式 |
| 任务分解视图适配 | 中 | 2天 | ✅ 高 | 通过 adapter 适配 WBS 组件输入 |
| 任务流程视图适配 | 中 | 2天 | ✅ 高 | 通过 adapter 适配 TaskFlow 组件输入 |
| 架构流程图 | 中 | 3天 | ✅ 高 | 新 Schema + 新组件 |
| 在线编辑节点 | 高 | 5天 | ⚠️ 中 | 需改造 React Flow |
| 在线编辑连线 | 高 | 3天 | ⚠️ 中 | 增量更新机制 |
| 保存编辑结果 | 中 | 2天 | ✅ 高 | 会话状态持久化 |

### 3.2 风险分析

#### 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LLM 输出不稳定 | 架构设计不合理 | 强化 Prompt、多轮验证、提供模板 |
| 在线编辑状态同步 | 数据不一致 | CRDT/OT 算法、乐观更新+回滚 |
| 复杂架构图渲染 | 性能问题 | 虚拟化渲染、分层展示 |

#### 中风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Token 预算超限 | 输出截断 | 分步生成、增量更新 |
| Schema 演进 | 兼容性问题 | 版本控制、迁移脚本 |

---

## 四、技术方案设计

### 4.1 插件架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Architect Plugin                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Architecture│  │ Task       │  │ Architecture       │  │
│  │ Designer    │  │ Decomposer │  │ Flowchart          │  │
│  │ (新增)      │  │ (复用WBS)  │  │ (新增)             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ArchitectGraph (统一输出格式)             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心数据结构

```typescript
// core/plugins/architect/schema.ts

export const ArchitectNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  // 节点类型：架构层、模块、服务、数据库、API等
  type: z.enum([
    'frontend',      // 前端层
    'backend',       // 后端层
    'database',      // 数据库
    'service',       // 微服务
    'api',           // API 接口
    'module',        // 功能模块
    'task',          // 任务节点
    'decision',      // 决策节点
  ]),
  // 视图归属
  view: z.enum(['architecture', 'taskflow', 'both']),
  status: z.enum(['planned', 'in-progress', 'completed', 'blocked']),
  // 详细信息
  metadata: z.object({
    description: z.string().optional(),
    technology: z.string().optional(),  // 技术栈
    assignee: z.string().optional(),
    estimatedHours: z.number().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
  }).optional(),
});

export const ArchitectEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.enum([
    'dependency',    // 依赖关系
    'dataflow',      // 数据流向
    'sequence',      // 执行顺序
    'contains',      // 包含关系
    'calls',         // 调用关系
  ]),
  label: z.string().optional(),
});

export const ArchitectGraphSchema = z.object({
  version: z.literal('architect.v1'),
  title: z.string(),
  description: z.string(),
  // 架构概述
  architecture: z.object({
    style: z.string(),           // 架构风格：monolith/microservice/serverless等
    technologies: z.array(z.string()),
    layers: z.array(z.string()),
  }),
  // 统一节点池（架构图+任务图共享）
  nodes: z.array(ArchitectNodeSchema),
  // 统一边池
  edges: z.array(ArchitectEdgeSchema),
  // 任务列表（从节点中提取 task 类型）
  tasks: z.array(z.object({
    nodeId: z.string(),
    order: z.number(),
    phase: z.string(),  // 阶段：需求/设计/开发/测试/部署
  })),
  // 增量更新支持
  updates: z.object({
    addedNodeIds: z.array(z.string()),
    updatedNodeIds: z.array(z.string()),
    removedNodeIds: z.array(z.string()),
  }),
});

export type ArchitectGraph = z.infer<typeof ArchitectGraphSchema>;
```

### 4.3 Prompt 设计

```typescript
// core/plugins/architect/prompt.ts

export function architectPrompt(input: string, state: SessionState): Message[] {
  return [
    {
      role: 'system',
      content: `你是资深软件架构师和项目经理。

用户输入需求后，你需要：
1. 设计系统架构（技术选型、模块划分、数据流）
2. 分解开发任务（按阶段、按优先级）
3. 生成执行流程

硬性要求：
1. 只输出 JSON，禁止解释或 Markdown
2. 输出必须符合 Schema
3. 架构设计需考虑：可扩展性、可维护性、安全性
4. 任务分解需遵循：SMART原则、依赖关系明确
5. 节点 ID 必须稳定可复用

架构设计模板参考：
- 后台管理系统：前端(React/Vue) + 后端(Node/Java/Go) + 数据库(PostgreSQL/MySQL) + 认证(JWT/OAuth)
- 电商平台：用户模块、商品模块、订单模块、支付模块、物流模块
- 内容管理：CMS 核心、媒体库、权限系统、API 网关

... Schema 定义 ...`,
    },
    // 历史上下文
    ...(state.summary ? [{ role: 'system', content: `摘要: ${state.summary}` }] : []),
    ...(state.history ?? []),
    // 当前数据
    ...(state.architect ? [{ role: 'system', content: `当前架构: ${JSON.stringify(state.architect)}` }] : []),
    // 用户输入
    { role: 'user', content: input },
  ];
}
```

### 4.4 前端可视化组件

```typescript
// app/components/ArchitectFlow.tsx

interface ArchitectFlowProps {
  graph: ArchitectGraph | null;
  view: 'architecture' | 'taskflow';  // 视图切换
  editable?: boolean;                  // 是否可编辑
  onChange?: (graph: ArchitectGraph) => void;
}

export function ArchitectFlow({ graph, view, editable, onChange }: ArchitectFlowProps) {
  // 过滤当前视图的节点
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter(n => n.view === view || n.view === 'both');
  }, [graph, view]);

  // React Flow 状态
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 编辑支持
  const handleNodeChange = useCallback((changes: NodeChange[]) => {
    if (!editable || !onChange) return;
    // 将 React Flow 变更同步到 ArchitectGraph
    // ...
  }, [editable, onChange]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={editable ? onNodesChange : undefined}
      onEdgesChange={editable ? onEdgesChange : undefined}
      onConnect={editable ? handleConnect : undefined}
      nodesConnectable={editable}
      elementsSelectable={editable}
    >
      {/* 自定义节点类型 */}
      <NodeTypes
        architecture={ArchitectureNode}
        task={TaskNode}
        decision={DecisionNode}
      />
    </ReactFlow>
  );
}
```

### 4.5 在线编辑实现方案

#### 方案 A: React Flow 原生编辑（推荐）

```typescript
// 优点：开发成本低、用户交互熟悉
// 缺点：需要实现数据同步机制

// 核心实现
const onNodesChange: OnNodesChange = useCallback((changes) => {
  // 1. 应用变更到 React Flow 状态
  setNodes((nds) => applyNodeChanges(changes, nds));

  // 2. 同步到 ArchitectGraph
  const updatedGraph = syncChangesToGraph(graph, changes);

  // 3. 回调上层
  onChange?.(updatedGraph);
}, [graph, onChange]);
```

#### 方案 B: 侧边栏表单编辑

```typescript
// 优点：数据验证更可靠、用户体验更明确
// 缺点：需要额外 UI 开发

const [selectedNode, setSelectedNode] = useState<ArchitectNode | null>(null);

<ArchitectFlow onNodeClick={(e, node) => setSelectedNode(node.data)} />

{selectedNode && (
  <EditPanel
    node={selectedNode}
    onSave={(updated) => {
      // 更新节点
      updateNode(updated);
      setSelectedNode(null);
    }}
  />
)}
```

#### 方案 C: 混合方案（最佳实践）

```
1. 拖拽移动节点 → React Flow 原生
2. 双击编辑文本 → 内联编辑器
3. 右键菜单 → 删除、添加连接、属性编辑
4. 侧边栏 → 详细属性编辑（技术栈、描述等）
```

---

## 五、实现路线图

### Phase 1: 核心功能（MVP）- ✅ 已完成

```
已完成项：
1. Schema 定义 + Prompt 设计
2. architect 插件核心逻辑 + LLM 集成
3. 架构视图可视化组件（ArchitectureFlow）
4. 导出 PNG / 复制 JSON 功能
5. architect 页面只读集成 WBS 视图与流程视图（通过 adapter 适配现有组件）
6. API 端点 + 前端集成
7. Phase 1 验证摘要卡片
```

### Phase 2: 编辑能力 - ✅ 已完成

#### 阶段 2.1: 编辑模式框架 - ✅ 已完成（2026-03-20）

**实现内容：**
- 反向转换函数 `flowToArchitecture()` - React Flow 节点/边 → ArchitectureJson
- ArchitectureFlow 组件编辑模式状态管理
- 工具栏动态切换（查看模式 / 编辑模式）
- 保存/取消编辑流程
- 变更追踪（addedComponentIds, updatedComponentIds, removedComponentIds）
- architect 页面集成 `editable={true}`

**修改文件：**
- `lib/architecture/adapters.ts` - 新增 `flowToArchitecture()`
- `app/components/ArchitectureFlow.tsx` - 编辑模式状态、UI 切换
- `app/components/ArchitectureFlow.module.css` - 编辑按钮样式、编辑中徽章
- `app/plugin/architect/page.tsx` - 启用编辑功能

**当前功能：**
| 操作 | 状态 |
|------|------|
| 点击"编辑"进入编辑模式 | ✅ |
| 拖拽节点位置 | ✅ |
| 点击"保存"确认修改 | ✅ |
| 点击"取消"恢复原始数据 | ✅ |
| 变更追踪 | ✅ |

#### 阶段 2.2: 节点编辑 - ✅ 已完成（2026-03-23）

**实现内容：**
- 双击节点进入文本编辑（弹出内联编辑框，Enter 确认，Esc 取消）
- 右键菜单删除节点（自动删除相关连线）
- 新增节点表单（名称、类型、架构层、技术栈、描述）
- 自定义节点组件 ArchitectureNodeComponent（支持动态渲染编辑后的名称）

**修改文件：**
- `lib/architecture/utils.ts` - 新增工具函数（ID 生成、默认位置、验证）
- `app/components/ArchitectureFlow.tsx` - 添加编辑功能、右键菜单、新增节点弹窗
- `app/components/ArchitectureFlow.module.css` - 添加新组件样式
- `lib/architecture/adapters.ts` - 更新 ArchitectureNodeData 接口

**当前功能：**
| 操作 | 状态 |
|------|------|
| 双击节点编辑名称 | ✅ |
| 右键菜单删除节点 | ✅ |
| 新增节点表单 | ✅ |
| 拖拽节点位置 | ✅ |
| 点击"保存"确认修改 | ✅ |
| 点击"取消"恢复原始数据 | ✅ |
| 变更追踪 | ✅ |

#### 阶段 2.3: 连线编辑 - ✅ 已完成（2026-03-23）

**实现内容：**
- 从节点 Handle 拖出创建新连线（通过 onConnect 回调）
- 点击连线选中（视觉高亮反馈）
- Delete/Backspace 键删除选中连线
- 右键菜单删除连线
- 连线类型选择弹窗（http、websocket、tcp、grpc、database、cache、queue、file）
- 选中连线的视觉样式更新（橙色高亮边框）

**修改文件：**
- `lib/architecture/constants.ts` - 新增 CONNECTION_TYPE_OPTIONS 连线类型选项
- `app/components/ArchitectureFlow.tsx` - 添加连线编辑功能（创建、选中、删除、类型选择）
- `app/components/ArchitectureFlow.module.css` - 添加连线类型选择弹窗样式
- `lib/architecture/adapters.ts` - 确保 edge.data.connectionType 正确映射到 ArchitectureConnection

**当前功能：**
| 操作 | 状态 |
|------|------|
| 从 Handle 拖拽创建连线 | ✅ |
| 点击选中连线 | ✅ |
| Delete/Backspace 删除连线 | ✅ |
| 右键菜单删除连线 | ✅ |
| 修改连线类型 | ✅ |
| 双击节点编辑名称 | ✅ |
| 右键菜单删除节点 | ✅ |
| 新增节点表单 | ✅ |
| 拖拽节点位置 | ✅ |
| 点击"保存"确认修改 | ✅ |
| 点击"取消"恢复原始数据 | ✅ |
| 变更追踪 | ✅ |


### Phase 3: 增强功能 - 预计 3 天

```
Day 11: 导出 Mermaid 格式
Day 12: 模板库（预设架构模板）
Day 13: 性能优化 + 测试
```

#### 阶段 3.1: Mermaid 导出 - 待实现

**目标：** 将架构图导出为 Mermaid flowchart 格式，便于在 Markdown 文档、GitHub、Notion 等平台直接渲染。

**技术方案：**

1. **Mermaid 转换函数** (`lib/architecture/mermaid.ts`)

```typescript
/**
 * 将 ArchitectureJson 转换为 Mermaid flowchart 语法
 *
 * 输出示例：
 * ```mermaid
 * flowchart TB
 *   subgraph presentation [表现层]
 *     frontend[前端应用<br/>React]
 *   end
 *   subgraph application [应用层]
 *     backend[后端服务<br/>Node.js]
 *     api[API 网关]
 *   end
 *   frontend -->|http| api
 *   api -->|http| backend
 *   backend -->|database| db[(数据库)]
 * ```
 */
export function architectureToMermaid(architecture: ArchitectureJson): string {
  const lines: string[] = [];
  const { components, connections, style } = architecture;

  // 1. 图表方向：TB (从上到下) 或 LR (从左到右)
  lines.push('flowchart TB');
  lines.push('');

  // 2. 按架构层分组生成 subgraph
  const layers = groupByLayer(components);
  for (const [layerName, comps] of layers) {
    lines.push(`  subgraph ${layerName} [${getLayerLabel(layerName)}]`);
    for (const comp of comps) {
      const nodeDef = formatMermaidNode(comp);
      lines.push(`    ${nodeDef}`);
    }
    lines.push('  end');
    lines.push('');
  }

  // 3. 生成连接关系
  for (const conn of connections) {
    const edgeDef = formatMermaidEdge(conn);
    lines.push(`  ${edgeDef}`);
  }

  // 4. 样式定义（可选）
  lines.push('');
  lines.push(generateMermaidStyles(components));

  return lines.join('\n');
}

/**
 * 格式化 Mermaid 节点定义
 * 根据组件类型选择不同的形状：
 * - database: [(名称)]
 * - queue: {{名称}}
 * - external-api: [[名称]]
 * - 默认: [名称]
 */
function formatMermaidNode(comp: ArchitectureComponent): string {
  const label = comp.technology
    ? `${comp.name}<br/>${comp.technology}`
    : comp.name;

  switch (comp.type) {
    case 'database':
      return `${comp.id}[((${label}))]`;
    case 'queue':
      return `${comp.id}{{${label}}}`;
    case 'external-api':
      return `${comp.id}[[${label}]]`;
    case 'cache':
      return `${comp.id}[(${label})]`;
    default:
      return `${comp.id}[${label}]`;
  }
}

/**
 * 格式化 Mermaid 边定义
 * 使用不同的线型表示不同的连接类型
 */
function formatMermaidEdge(conn: ArchitectureConnection): string {
  const label = conn.label || conn.type;

  switch (conn.type) {
    case 'websocket':
      return `${conn.from} -.->|${label}| ${conn.to}`;
    case 'cache':
    case 'queue':
      return `${conn.from} -.->|${label}| ${conn.to}`;
    default:
      return `${conn.from} -->|${label}| ${conn.to}`;
  }
}

/**
 * 生成 Mermaid 样式定义
 */
function generateMermaidStyles(components: ArchitectureComponent[]): string {
  const styles: string[] = [];

  // 为不同类型节点定义颜色
  const typeStyles: Record<string, string> = {
    frontend: 'fill:#3b82f6,color:#fff',
    backend: 'fill:#10b981,color:#fff',
    database: 'fill:#f59e0b,color:#fff',
    cache: 'fill:#ef4444,color:#fff',
    queue: 'fill:#8b5cf6,color:#fff',
    'api-gateway': 'fill:#06b6d4,color:#fff',
    'auth-service': 'fill:#ec4899,color:#fff',
  };

  for (const comp of components) {
    const style = typeStyles[comp.type];
    if (style) {
      styles.push(`style ${comp.id} ${style}`);
    }
  }

  return styles.join('\n');
}
```

2. **UI 集成** (`app/components/ArchitectureFlow.tsx`)

```typescript
// 工具栏添加 Mermaid 导出按钮
async function handleExportMermaid() {
  if (!architecture) return;

  const mermaidCode = architectureToMermaid(architecture);

  // 复制到剪贴板
  await navigator.clipboard.writeText(mermaidCode);
  toast.success('Mermaid 代码已复制到剪贴板');
}

// 下载 .mmd 文件
function handleDownloadMermaid() {
  if (!architecture) return;

  const mermaidCode = architectureToMermaid(architecture);
  const blob = new Blob([mermaidCode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = `${architecture.title || 'architecture'}.mmd`;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
  toast.success('Mermaid 文件已下载');
}
```

**修改文件：**
- `lib/architecture/mermaid.ts` - 新建 Mermaid 转换函数
- `app/components/ArchitectureFlow.tsx` - 添加导出按钮

**预期功能：**
| 功能 | 状态 |
|------|------|
| 转换为 Mermaid flowchart | 待实现 |
| 复制 Mermaid 代码 | 待实现 |
| 下载 .mmd 文件 | 待实现 |
| 按架构层分组显示 | 待实现 |
| 不同节点类型样式 | 待实现 |

---

#### 阶段 3.2: 架构模板库 - 待实现

**目标：** 提供预设架构模板，用户可以快速选择常见架构模式作为起点。

**技术方案：**

1. **模板数据结构** (`lib/architecture/templates.ts`)

```typescript
/**
 * 架构模板定义
 */
export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'microservice' | 'serverless' | 'data' | 'mobile';
  tags: string[];
  preview: string; // 预览图片 URL 或 base64
  architecture: Omit<ArchitectureJson, 'updates'>;
}

/**
 * 预设模板列表
 */
export const ARCHITECTURE_TEMPLATES: ArchitectureTemplate[] = [
  {
    id: 'admin-dashboard',
    name: '后台管理系统',
    description: '经典的前后端分离架构，适用于管理后台、CMS 等场景',
    category: 'web',
    tags: ['admin', 'cms', 'monolith'],
    preview: '/templates/admin-dashboard.png',
    architecture: {
      version: 'arch.v1',
      title: '后台管理系统架构',
      style: 'monolith',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'data' },
      ],
      components: [
        { id: 'web-frontend', name: 'Web 前端', type: 'frontend', layer: 'presentation', technology: 'React' },
        { id: 'api-server', name: 'API 服务', type: 'backend', layer: 'application', technology: 'Node.js' },
        { id: 'auth-service', name: '认证服务', type: 'auth-service', layer: 'application', technology: 'JWT' },
        { id: 'mysql', name: 'MySQL 数据库', type: 'database', layer: 'data', technology: 'MySQL' },
        { id: 'redis', name: 'Redis 缓存', type: 'cache', layer: 'data', technology: 'Redis' },
      ],
      connections: [
        { id: 'conn-1', from: 'web-frontend', to: 'api-server', type: 'http', label: 'REST API' },
        { id: 'conn-2', from: 'api-server', to: 'auth-service', type: 'http', label: '验证 Token' },
        { id: 'conn-3', from: 'api-server', to: 'mysql', type: 'database' },
        { id: 'conn-4', from: 'api-server', to: 'redis', type: 'cache' },
      ],
      techStack: [
        { category: 'frontend', name: 'React', version: '18.x' },
        { category: 'backend', name: 'Node.js', version: '20.x' },
        { category: 'database', name: 'MySQL', version: '8.x' },
        { category: 'cache', name: 'Redis', version: '7.x' },
      ],
    },
  },
  {
    id: 'e-commerce',
    name: '电商平台',
    description: '微服务架构的电商平台，支持用户、商品、订单、支付等核心模块',
    category: 'microservice',
    tags: ['e-commerce', 'microservice', 'high-traffic'],
    preview: '/templates/e-commerce.png',
    architecture: {
      version: 'arch.v1',
      title: '电商平台架构',
      style: 'microservice',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'domain' },
        { name: 'infrastructure' },
        { name: 'data' },
      ],
      components: [
        { id: 'web-app', name: 'Web 应用', type: 'frontend', layer: 'presentation', technology: 'Next.js' },
        { id: 'mobile-app', name: '移动应用', type: 'frontend', layer: 'presentation', technology: 'React Native' },
        { id: 'api-gateway', name: 'API 网关', type: 'api-gateway', layer: 'application', technology: 'Kong' },
        { id: 'user-service', name: '用户服务', type: 'backend', layer: 'domain' },
        { id: 'product-service', name: '商品服务', type: 'backend', layer: 'domain' },
        { id: 'order-service', name: '订单服务', type: 'backend', layer: 'domain' },
        { id: 'payment-service', name: '支付服务', type: 'backend', layer: 'domain' },
        { id: 'message-queue', name: '消息队列', type: 'queue', layer: 'infrastructure', technology: 'RabbitMQ' },
        { id: 'user-db', name: '用户数据库', type: 'database', layer: 'data', technology: 'PostgreSQL' },
        { id: 'product-db', name: '商品数据库', type: 'database', layer: 'data', technology: 'MongoDB' },
        { id: 'order-db', name: '订单数据库', type: 'database', layer: 'data', technology: 'MySQL' },
        { id: 'redis-cluster', name: 'Redis 集群', type: 'cache', layer: 'data', technology: 'Redis Cluster' },
      ],
      connections: [
        { id: 'conn-1', from: 'web-app', to: 'api-gateway', type: 'http' },
        { id: 'conn-2', from: 'mobile-app', to: 'api-gateway', type: 'http' },
        { id: 'conn-3', from: 'api-gateway', to: 'user-service', type: 'grpc' },
        { id: 'conn-4', from: 'api-gateway', to: 'product-service', type: 'grpc' },
        { id: 'conn-5', from: 'api-gateway', to: 'order-service', type: 'grpc' },
        { id: 'conn-6', from: 'order-service', to: 'payment-service', type: 'http' },
        { id: 'conn-7', from: 'order-service', to: 'message-queue', type: 'queue' },
        { id: 'conn-8', from: 'user-service', to: 'user-db', type: 'database' },
        { id: 'conn-9', from: 'product-service', to: 'product-db', type: 'database' },
        { id: 'conn-10', from: 'order-service', to: 'order-db', type: 'database' },
      ],
      techStack: [
        { category: 'frontend', name: 'Next.js' },
        { category: 'gateway', name: 'Kong' },
        { category: 'backend', name: 'Go / Node.js' },
        { category: 'queue', name: 'RabbitMQ' },
        { category: 'database', name: 'PostgreSQL / MySQL / MongoDB' },
        { category: 'cache', name: 'Redis' },
      ],
    },
  },
  {
    id: 'serverless-api',
    name: 'Serverless API',
    description: '无服务器架构，适用于 API 服务、事件驱动场景',
    category: 'serverless',
    tags: ['serverless', 'api', 'event-driven'],
    preview: '/templates/serverless.png',
    architecture: {
      version: 'arch.v1',
      title: 'Serverless API 架构',
      style: 'serverless',
      layers: [
        { name: 'presentation' },
        { name: 'application' },
        { name: 'infrastructure' },
        { name: 'data' },
      ],
      components: [
        { id: 'cdn', name: 'CDN', type: 'cdn', layer: 'presentation', technology: 'CloudFront' },
        { id: 'api-gateway', name: 'API Gateway', type: 'api-gateway', layer: 'application', technology: 'AWS API Gateway' },
        { id: 'lambda-auth', name: '认证函数', type: 'auth-service', layer: 'application', technology: 'Lambda' },
        { id: 'lambda-api', name: 'API 函数', type: 'backend', layer: 'application', technology: 'Lambda' },
        { id: 'lambda-worker', name: 'Worker 函数', type: 'backend', layer: 'application', technology: 'Lambda' },
        { id: 'sqs', name: 'SQS 队列', type: 'queue', layer: 'infrastructure', technology: 'SQS' },
        { id: 's3', name: '对象存储', type: 'storage', layer: 'data', technology: 'S3' },
        { id: 'dynamodb', name: 'DynamoDB', type: 'database', layer: 'data', technology: 'DynamoDB' },
      ],
      connections: [
        { id: 'conn-1', from: 'cdn', to: 'api-gateway', type: 'http' },
        { id: 'conn-2', from: 'api-gateway', to: 'lambda-auth', type: 'http' },
        { id: 'conn-3', from: 'api-gateway', to: 'lambda-api', type: 'http' },
        { id: 'conn-4', from: 'lambda-api', to: 'sqs', type: 'queue' },
        { id: 'conn-5', from: 'sqs', to: 'lambda-worker', type: 'queue' },
        { id: 'conn-6', from: 'lambda-api', to: 'dynamodb', type: 'database' },
        { id: 'conn-7', from: 'lambda-worker', to: 's3', type: 'file' },
      ],
      techStack: [
        { category: 'cdn', name: 'CloudFront' },
        { category: 'gateway', name: 'API Gateway' },
        { category: 'compute', name: 'Lambda' },
        { category: 'queue', name: 'SQS' },
        { category: 'storage', name: 'S3' },
        { category: 'database', name: 'DynamoDB' },
      ],
    },
  },
];

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): ArchitectureTemplate | undefined {
  return ARCHITECTURE_TEMPLATES.find(t => t.id === id);
}

/**
 * 按分类获取模板
 */
export function getTemplatesByCategory(category: ArchitectureTemplate['category']): ArchitectureTemplate[] {
  return ARCHITECTURE_TEMPLATES.filter(t => t.category === category);
}

/**
 * 从模板创建 ArchitectureJson
 */
export function createFromTemplate(templateId: string): ArchitectureJson | null {
  const template = getTemplateById(templateId);
  if (!template) return null;

  return {
    ...template.architecture,
    updates: {
      addedComponentIds: template.architecture.components.map(c => c.id),
      updatedComponentIds: [],
      removedComponentIds: [],
      addedConnectionIds: template.architecture.connections.map(c => c.id),
      removedConnectionIds: [],
    },
  };
}
```

2. **模板选择器组件** (`app/components/TemplateSelector.tsx`)

```typescript
interface TemplateSelectorProps {
  onSelect: (template: ArchitectureTemplate) => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = selectedCategory === 'all'
    ? ARCHITECTURE_TEMPLATES
    : getTemplatesByCategory(selectedCategory as any);

  return (
    <div className={styles.templateSelector}>
      <div className={styles.templateHeader}>
        <h2>选择架构模板</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className={styles.categoryTabs}>
        <button
          className={selectedCategory === 'all' ? styles.active : ''}
          onClick={() => setSelectedCategory('all')}
        >
          全部
        </button>
        {['web', 'microservice', 'serverless'].map(cat => (
          <button
            key={cat}
            className={selectedCategory === cat ? styles.active : ''}
            onClick={() => setSelectedCategory(cat)}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      <div className={styles.templateGrid}>
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={styles.templateCard}
            onClick={() => onSelect(template)}
          >
            <div className={styles.templatePreview}>
              <img src={template.preview} alt={template.name} />
            </div>
            <div className={styles.templateInfo}>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <div className={styles.templateTags}>
                {template.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**修改文件：**
- `lib/architecture/templates.ts` - 新建模板数据定义
- `app/components/TemplateSelector.tsx` - 新建模板选择器组件
- `app/components/ArchitectureFlow.module.css` - 添加模板选择器样式
- `app/plugin/architect/page.tsx` - 集成模板选择功能

**预期功能：**
| 功能 | 状态 |
|------|------|
| 预设模板数据 | 待实现 |
| 模板分类筛选 | 待实现 |
| 模板预览展示 | 待实现 |
| 从模板初始化架构 | 待实现 |

---

#### 阶段 3.3: 性能优化 - 待实现

**目标：** 提升大型架构图的渲染性能和用户体验。

**优化方案：**

1. **虚拟化渲染** (`app/components/ArchitectureFlow.tsx`)

```typescript
// 当节点数量超过阈值时，启用虚拟化渲染
const VIRTUALIZATION_THRESHOLD = 50;

// 使用 React Flow 的虚拟化特性
<ReactFlow
  nodes={nodes}
  edges={edges}
  // 大型图表时启用虚拟化
  onlyRenderVisibleElements={nodes.length > VIRTUALIZATION_THRESHOLD}
  // 减少不必要的重渲染
  nodesDraggable={isEditing}
  nodesConnectable={isEditing}
  // 优化缩放性能
  minZoom={0.1}
  maxZoom={2}
  defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
/>
```

2. **布局算法优化** (`lib/architecture/layout.ts`)

```typescript
/**
 * 大型架构图布局优化
 * - 使用 Web Worker 进行布局计算
 * - 增量布局（只对新/变更节点重新布局）
 */
export function getOptimizedLayout(
  components: ArchitectureComponent[],
  connections: ArchitectureConnection[],
  existingPositions?: Map<string, XYPosition>
): LayoutedComponent[] {
  // 如果已有位置且组件数量变化不大，使用增量布局
  if (existingPositions && existingPositions.size > 0) {
    const existingIds = new Set(existingPositions.keys());
    const newComponents = components.filter(c => !existingIds.has(c.id));

    // 只对新组件进行布局
    if (newComponents.length < components.length * 0.3) {
      return incrementalLayout(components, connections, existingPositions);
    }
  }

  // 全量布局
  return getLayoutedArchitecture(components, connections);
}
```

3. **节点渲染优化**

```typescript
// 使用 React.memo 优化节点组件
const ArchitectureNodeComponent = React.memo(function ArchitectureNodeComponent(
  { data }: { data: ArchitectureNodeData }
) {
  // ... 组件实现
}, arePropsEqual);

function arePropsEqual(prev: { data: ArchitectureNodeData }, next: { data: ArchitectureNodeData }) {
  return (
    prev.data.name === next.data.name &&
    prev.data.type === next.data.type &&
    prev.data.technology === next.data.technology
  );
}
```

4. **性能监控**

```typescript
// 添加性能监控埋点
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    return () => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 100) {
        console.warn(`[ArchitectureFlow] Slow render: ${renderTime.toFixed(2)}ms for ${nodes.length} nodes`);
      }
    };
  }
}, [nodes.length]);
```

**修改文件：**
- `app/components/ArchitectureFlow.tsx` - 添加虚拟化和性能优化
- `lib/architecture/layout.ts` - 优化布局算法

**预期功能：**
| 优化项 | 状态 |
|------|------|
| 虚拟化渲染（>50 节点） | 待实现 |
| 增量布局计算 | 待实现 |
| 节点组件 memo 优化 | 待实现 |
| 性能监控埋点 | 待实现 |

---

## 六、技术决策建议

### 6.1 推荐方案

| 决策点 | 推荐方案 | 理由 |
|--------|----------|------|
| 复用边界 | 只复用组件，不复用 WBS / TaskFlow 插件逻辑 | 避免业务模型耦合，降低维护成本 |
| 数据建模 | `architect` 保持独立 `ArchitectureJson` | 以架构语义作为唯一真实来源 |
| 组件适配 | 增加 adapter 层，将 `ArchitectureJson` 映射到组件输入结构 | 复用 UI 能力而不牺牲业务边界 |
| 在线编辑 | 混合方案(C) | 兼顾灵活性与数据完整性 |
| 状态管理 | React Flow 内置 | 减少额外复杂度 |
| 数据同步 | 乐观更新 + 定时保存 | 用户体验好，风险可控 |
| 增量更新 | 基于节点 ID 的 diff | 减少数据传输 |

### 6.1.1 复用原则补充

```text
1. 不把 architect / wbs / taskFlow 三个 plugin 黏合成一个统一插件
2. architect 继续输出自己的业务模型（ArchitectureJson）
3. WBS / TaskFlow 仅作为可视化组件复用对象
4. 复用方式不是让 architect 直接产出 WbsGraph / FlowchartGraph
5. 正确做法是：ArchitectureJson -> adapter -> 组件输入结构 -> 渲染
```

### 6.2 替代方案

| 决策点 | 替代方案 | 适用场景 |
|--------|----------|----------|
| 流程图库 | Mermaid + 编辑器 | 纯展示场景，无需交互 |
| 状态管理 | Zustand/Jotai | 复杂编辑场景，需要时间旅行 |
| 协作编辑 | Y.js + WebSocket | 多人实时协作 |

---

## 七、结论

### 7.1 总体可行性：✅ 高度可行

该项目需求与现有系统架构高度契合，但复用应限定在组件层而不是插件层。`architect` 作为独立插件保持自己的数据模型，通过 adapter 适配 WBS / TaskFlow 组件输入结构，是当前最稳妥的落地方式。

### 7.2 关键成功因素

1. **Prompt 质量** - 架构设计的合理性取决于 LLM 输出质量
2. **Schema 设计** - 需平衡灵活性与结构化程度
3. **用户体验** - 在线编辑的交互设计决定产品易用性

### 7.3 建议实施顺序

```
1. 小阶段 1：保持 architect 独立模型，先稳定架构生成质量
2. 小阶段 2：抽取 adapter，将 ArchitectureJson 适配到 TaskFlow / WBS 组件输入（已完成只读验证）
3. 小阶段 3：验证组件复用是否成立，再决定是否抽通用 GraphViewModel
4. 小阶段 4：在 architect 页面内补基础编辑能力（先文本属性，后节点关系）
5. 小阶段 5：最后评估是否需要统一图模型，而不是提前设计大一统结构
```

### 7.4 风险缓解预算

| 风险类型 | 预留时间 |
|----------|----------|
| LLM 输出调优 | +2 天 |
| 编辑状态同步问题 | +2 天 |
| 性能优化 | +1 天 |

**总预估工期：13-18 天**

---

## 附录：参考资源

### A. 相关代码文件

- `core/plugins/wbs/index.ts` - WBS 插件实现
- `core/plugins/taskFlow/index.ts` - TaskFlow 插件实现
- `app/components/taskFlow.tsx` - React Flow 可视化
- `docs/plugin-development.md` - 插件开发指南

### B. 技术文档

- [React Flow 文档](https://reactflow.dev/docs/)
- [Zod Schema 文档](https://zod.dev/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### C. 类似产品参考

- [Excalidraw](https://excalidraw.com/) - 在线白板
- [Draw.io](https://app.diagrams.net/) - 架构图编辑器
- [Miro](https://miro.com/) - 协作白板




