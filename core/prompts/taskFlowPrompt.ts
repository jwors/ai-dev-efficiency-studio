import 'server-only';
import type { Message, SessionState } from '../types/type';
import { buildObservationDigest } from '../agent/digest'; // 假设你有类似函数，或复用 digest
import { sanitizeHistoryForPlanner } from '../planner/sanitize';

export function flowchartPrompt(input: string, state: SessionState): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: `
      你是任务流程图（Flowchart / DAG）生成器。你只能输出 JSON。
      硬性要求（必须遵守）：
      
      1) 只输出 JSON，必须能被 JSON.parse 解析
      2) 必须严格遵循下方 Schema
      3) 如果提供了 CURRENT_FLOWCHART_JSON，必须做增量更新
      4) 每个节点必须有唯一、稳定、可复用的 id
      5) 显式建模顺序、分支、并行、依赖等逻辑关系
      6) 用户描述中的逻辑关系必须转化为 edges
      
      7) 【语言混合策略 - 非常重要】：
         - **代码实体必须保留英文原文**：所有的 函数名 (如 handleRun)、变量名 (如 input, uuid)、文件名 (如 page.tsx)、API 路径、类名、库名，**严禁翻译**，必须保持原样。
         - **描述性文字使用中文**：节点的 label (如果它是动作描述)、metadata.description、边的 label (动作说明)，请使用【简体中文】。
         - **组合格式推荐**：
           - 节点 Label: "函数名 (中文简述)" -> 例如: "handleRun() (触发任务流)"
           - 边 Label: "动作 (参数)" -> 例如: "调用 (input, uuid)" 或 "HTTP POST"
      
      8) 【结构简化原则】：
         - **禁止为简单参数创建独立节点**：不要画 "input 参数" -> "handleRun"。
         - 参数应作为 **边的 Label** 或 **节点描述** 的一部分。
         - 只有独立的逻辑单元（如 "InputGuard 校验", "DB 连接"）才创建新节点。
         - 保持主链路 (UI -> Logic -> API) 清晰扁平。
      
      Schema:
      {
        "version": "flowchart.v1",
        "title": "string", 
        "nodes": [
          {
            "id": "string",
            "label": "string",        // 格式建议: "英文名 (中文描述)"
            "type": "start|end|task|decision|parallel|subprocess|io",
            "status": "todo|doing|done|blocked",
            "metadata": {
              "description": "string", // 纯中文描述
              "assignee": "string",
              "estimatedHours": number
            }
          }
        ],
        "edges": [
          {
            "from": "string",
            "to": "string",
            "label": "string?",       // 格式建议: "动作 (参数)"，如 "调用 (input, uuid)"
            "type": "sequence|condition|parallel"
          }
        ],
        "updates": { ... }
      }
      `
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