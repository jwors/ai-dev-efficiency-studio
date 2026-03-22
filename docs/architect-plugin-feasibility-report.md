# 架构规划插件可行性报告

## 更新说明（基于当前代码复评，2026-03-20）

本报告最初从”新插件规划”角度出发，但结合当前仓库实现，`architect` 插件已经完成了 MVP 级落地，以下结论应作为阅读本报告的前置说明：

1. **”架构图生成插件”本身已可行且已实现**
   - 当前仓库已经具备完整链路：`architect` 插件、`/api/architect` 路由、页面入口、架构图可视化组件、会话态保存、Schema 校验与输出归一化。
   - 因此，报告中”开发一个新插件”的表述已经过时，更准确的说法应为：**现有插件已完成基础落地，后续重点是增强与整合**。

2. **当前真实能力范围：已完成架构生成、展示与编辑模式框架**
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
   - 进行中：
     - 节点文本编辑、新增/删除节点
     - 连线编辑
   - 未完成：
     - 与 WBS / TaskFlow 的统一 `ArchitectGraph` 模型
     - 原生任务语义建模（当前仅完成只读视图投影，不复用 plugin 逻辑）
     - 编辑结果持久化与冲突处理

3. **报告中的“高复用”判断基本成立，但“直接复用”表述偏乐观**
   - `@xyflow/react`、LLM 封装、Zod 校验、会话管理等基础设施确实可复用。
   - 但 WBS 与 TaskFlow 当前仍是独立插件，若要形成统一的“架构 + 任务 + 流程”一体化图模型，属于新增一层编排，不是简单拼接已有代码。

4. **工期评估需要按目标拆分**
   - 若目标仅为“架构图生成插件 MVP”，该目标实际上已经完成。
   - 若目标是报告中描述的完整形态，即“统一模型 + 任务拆解 + 流程图联动 + 在线编辑”，则 `13-18` 天偏乐观，更合理的预期应按 3 个阶段推进：
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

### Phase 2: 编辑能力 - 进行中

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

#### 阶段 2.2: 节点编辑 - ✅ 已完成（2026-03-22）

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

#### 阶段 2.3: 连线编辑 - 待实施

```
- 从节点拖出创建新连线
- 点击连线选中 + 删除
- 连线类型选择（http、websocket 等）
```

### Phase 3: 增强功能 - 预计 3 天

```
Day 11: 导出 PNG/Mermaid
Day 12: 模板库（预设架构模板）
Day 13: 性能优化 + 测试
```

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




