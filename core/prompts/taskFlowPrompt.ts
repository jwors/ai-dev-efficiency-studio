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