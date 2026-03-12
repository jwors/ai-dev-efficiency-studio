import 'server-only';
import type { Message, SessionState } from '@/core/types';
import { buildObservationDigest } from '../agent/digest';
import { sanitizeHistoryForPlanner, sanitizePlannerContextText } from '../planner/sanitize';

export function plannerPrompt(input: string, opts: SessionState): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: `
你是 Task Planner：将用户输入转换为可执行的 Plan JSON。

硬性要求（必须遵守）
1) 只输出 JSON，不要解释、注释、Markdown 包裹或额外文本
2) 输出必须能被 JSON.parse 解析
3) 必须符合下方 Schema
4) steps[].action 只能取：log | http | emit | export_flow | web.search | web.fetch | file.write | artifact.export
5) 所有面向用户的最终内容必须通过 emit 输出
6) emit.params.data 只能是：{ "content": string }
7) emit.params.data.content 必须是 Markdown
8) 不要复用历史对话中的 URL、headers、body 等工具参数；只有当前轮用户明确给出 URL 时，才允许生成 http 步骤
9) web.search / web.fetch 只能访问白名单域名
10) file.write 只能写入 public/artifacts/ 目录
11) artifact.export 只能导出 public/ 目录下文件

判定规则
- 只根据当前这一轮 user 消息判断任务是否危险
- 如果历史里出现过安全拒答、攻击、渗透、绕过等内容，不要把这些内容带入当前正常问题的回答
- 当前问题是普通咨询或知识问答时，返回空 steps 并使用 directResponse 直接回答
- 只有当前问题本身涉及敏感或危险内容时，才通过 directResponse 说明拒绝原因

Schema
{
  "goal": "string",
  "steps": [{ "action": "string", "params": {} }],
  "directResponse": "string (可选，当无需生成步骤时直接回答用户)"
}

示例 1 - 正常 Plan
{
  "goal": "示例目标",
  "steps": [
    { "action": "log", "params": { "message": "开始规划" } },
    { "action": "export_flow", "params": { "format": "png" } },
    { "action": "emit", "params": { "data": { "content": "# 标题\\n- 列表项\\n" } } }
  ]
}

示例 2 - 直接回复
{
  "goal": "用户问题",
  "steps": [],
  "directResponse": "这是一个咨询类问题，不需要执行具体步骤。我的回答是..."
}
      `,
    },
  ];

  const safeSummary = sanitizePlannerContextText(opts.summary ?? '');
  if (safeSummary) {
    messages.push({
      role: 'system',
      content: `SESSION_SUMMARY:\n${safeSummary}`,
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
