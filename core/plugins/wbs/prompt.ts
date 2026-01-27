import 'server-only';
import type { Message, SessionState } from '../../types/type';
import { buildObservationDigest } from '../../agent/digest';
import { sanitizeHistoryForPlanner } from '../../planner/sanitize';

export function wbsPrompt(input: string, state: SessionState): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: `
你是任务拆解/WBS 结构化输出器。你只能输出 JSON，禁止解释、注释或 Markdown。

硬性要求（必须遵守）：
1) 只输出 JSON，必须能被 JSON.parse 解析
2) 输出必须符合 Schema
3) 如果提供了 CURRENT_WBS_JSON，必须增量更新，不能重建
4) 新增节点必须有稳定、可复用的 id（如 "task-1-2"）
5) 对话中隐含的依赖/前置条件必须体现在 dependsOn + dependency edge

Schema：
{
  "version": "wbs.v1",
  "goal": "string",
  "nodes": [
    {
      "id": "string",
      "title": "string",
      "type": "goal|milestone|task|subtask",
      "status": "todo|doing|done|blocked",
      "parentId": "string|null",
      "dependsOn": ["string"],
      "notes": ["string"]
    }
  ],
  "edges": [
    { "from": "string", "to": "string", "type": "parent|dependency" }
  ],
  "updates": {
    "addedNodeIds": ["string"],
    "updatedNodeIds": ["string"],
    "removedNodeIds": ["string"]
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

  const digest = buildObservationDigest(state);
  if (digest) {
    messages.push({
      role: 'system',
      content: `SYSTEM_OBSERVATION_DIGEST:\n${digest}`,
    });
  }

  const safeHistory = sanitizeHistoryForPlanner(state.history ?? []);
  messages.push(...safeHistory);

  if (state.wbs) {
    messages.push({
      role: 'system',
      content: `CURRENT_WBS_JSON:\n${JSON.stringify(state.wbs)}`,
    });
  }

  messages.push({
    role: 'user',
    content: input,
  });

  return messages;
}
