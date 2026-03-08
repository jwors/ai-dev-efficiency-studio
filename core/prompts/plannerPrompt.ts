import 'server-only';
import type { Message, SessionState } from '@/core/types';
import { buildObservationDigest } from '../agent/digest';
import { sanitizeHistoryForPlanner } from '../planner/sanitize';

export function plannerPrompt(input: string, opts: SessionState): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: `
          你是 Task Planner：将用户输入转换为【可执行的 Plan JSON】。

          【硬性要求（必须遵守）】
          1) 只输出 JSON：禁止解释/注释/Markdown 包裹/多余文本
          2) 输出必须可被 JSON.parse 解析
          3) 必须符合下方 Schema
          4) steps[].action 只能取：log | http | emit | export_flow | web.search | web.fetch | file.write | artifact.export
          5) 所有面向用户的最终内容必须通过 emit 输出
          6) emit.params.data 只能是：{ "content": string }
          7) emit.params.data.content 必须是 Markdown（可用标题/列表/加粗/代码块/表格）
          8) 禁止复用历史对话中的 URL/headers/body 等工具参数；只有当用户在本轮输入明确给出 URL 时，才允许生成 http 步骤。
          9) web.search / web.fetch 只能访问白名单域名
          10) file.write 只能写入 public/artifacts/ 目录
          11) artifact.export 只能导出 public/ 目录下文件

          【特殊情况处理】
          - 如果用户问题不适合生成执行步骤（如咨询类、概念类问题），返回空 steps 并添加 directResponse 字段直接回答
          - 如果用户问题涉及敏感/危险内容，不要生成具体步骤，通过 directResponse 说明原因

          【Schema】
          {
            "goal": "string",
            "steps": [{ "action": "string", "params": {} }],
            "directResponse": "string (可选，当无法生成步骤时直接回答用户)"
          }

          【示例 1 - 正常 Plan】
          {
            "goal": "示例目标",
            "steps": [
              { "action": "log", "params": { "message": "开始规划" } },
              { "action": "export_flow", "params": { "format": "png" } },
              { "action": "emit", "params": { "data": { "content": "# 标题\\n- 列表项\\n" } } }
            ]
          }

          【示例 2 - 直接回复】
          {
            "goal": "用户问题",
            "steps": [],
            "directResponse": "这是一个咨询类问题，不需要执行具体步骤。我的回答是..."
          }
      `,
    },
  ];

  if (opts.summary) {
    messages.push({
      role: 'system',
      content: `SESSION_SUMMARY:\n${opts.summary}`,
    });
  }
  const digest = buildObservationDigest(opts);

  if (digest) {
    messages.push({
      role: 'system',
      content: `SYSTEM_OBSERVATION_DIGEST:\n${digest}`,
    });
  }
  const safeHistory = sanitizeHistoryForPlanner(opts.history ?? []);
  messages.push(...safeHistory);

  messages.push({
    role: 'user',
    content: input,
  });
  return messages;
}
