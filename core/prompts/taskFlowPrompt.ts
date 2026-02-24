import 'server-only';
import type { Message, SessionState } from '../types/type';
import { buildObservationDigest } from '../agent/digest'; // 假设你有类似函数，或复用 digest
import { sanitizeHistoryForPlanner } from '../planner/sanitize';

export function flowchartPrompt(input: string, state: SessionState): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: `
你是任务流程图（Flowchart / DAG）生成器。你只能输出 JSON，禁止解释、注释、Markdown 或任何额外文本。
硬性要求（必须遵守）：
1) 只输出 JSON，必须能被 JSON.parse 解析
2) 必须严格遵循下方 Schema
3) 如果提供了 CURRENT_FLOWCHART_JSON，必须做增量更新（不能重建整个图）
4) 每个节点必须有唯一、稳定、可复用的 id（如 "step-login", "task-validate-email"）
5) 显式建模顺序、分支、并行、依赖等逻辑关系
6) 用户描述中的“先...再...”、“如果...就...”、“同时...”等必须转化为 edges
7) 【重要】所有节点的 label（显示名称）和 metadata.description（描述）必须使用【简体中文】输出，不要使用英文。
8) 【重要简化原则】：
   - 禁止为简单的函数参数（如 input, uuid, id, data 等）创建独立的节点。
   - 参数信息应作为【边 (Edge) 的 label】或者【目标节点的 description】来体现。
   - 例如：不要画 "input 参数" -> "handleRun"，而应该画 "page.tsx" --[携带 input]--> "handleRun"。
   - 只有当某个步骤是独立的逻辑单元（如 "校验中间件", "日志服务", "数据库连接池"）时，才创建新节点。
   - 保持图表扁平化，核心链路（User -> UI -> Logic -> API）应清晰直观，避免过度拆解。

Schema:
{
  "version": "flowchart.v1",
  "title": "string", // 流程图标题，从用户目标中提取
  "nodes": [
    {
      "id": "string",
      "label": "string",        // 显示名称
      "type": "start|end|task|decision|parallel|subprocess|io",
      "status": "todo|doing|done|blocked",
      "metadata": {             // 可选附加信息
        "description": "string",
        "assignee": "string",
        "estimatedHours": number
      }
    }
  ],
  "edges": [
    {
      "from": "string",         // source node id
      "to": "string",           // target node id
      "label": "string?",       // 可选条件，如 "成功", "失败", "是", "否"
      "type": "sequence|condition|parallel"
    }
  ],
  "updates": {
    "addedNodeIds": ["string"],
    "updatedNodeIds": ["string"],
    "removedNodeIds": ["string"],
    "addedEdgeIds": ["string"], // 可用 "from->to" 作为 edge id
    "removedEdgeIds": ["string"]
  }
}
      `,
    },
  ];

  if (state.summary) {
    messages.push({
      role: 'system',
      content: `SESSION_SUMMARY:\n${state.summary}`,
    });
  }

  const digest = buildObservationDigest(state); // 或复用 buildObservationDigest
  if (digest) {
    messages.push({
      role: 'system',
      content: `SYSTEM_OBSERVATION_DIGEST:\n${digest}`,
    });
  }

  const safeHistory = sanitizeHistoryForPlanner(state.history ?? []);
  messages.push(...safeHistory);

  // 如果已有流程图，传入供增量更新
  if (state.flowchart) {
    messages.push({
      role: 'system',
      content: `CURRENT_FLOWCHART_JSON:\n${JSON.stringify(state.flowchart)}`,
    });
  }

  messages.push({
    role: 'user',
    content: input,
  });

  return messages;
}