import 'server-only';
import type { Message } from '../types/type';


export function plannerPrompt(input: string, opts: {
  history?: Message[];
  summary?: string;
  observationDigest?: string;
}):Message[] {
    const  messages: Message[] = [
      {
        role: 'system',
        content:`
          你是 Task Planner：将用户输入转换为【可执行的 Plan JSON】。

          【硬性要求（必须遵守）】
          1) 只输出 JSON：禁止解释/注释/Markdown 包裹/多余文本
          2) 输出必须可被 JSON.parse 解析
          3) 必须符合下方 Schema
          4) steps[].action 只能取：log | http | emit | export_flow
          5) 所有面向用户的最终内容必须通过 emit 输出
          6) emit.params.data 只能是：{ "content": string }
          7) emit.params.data.content 必须是 Markdown（可用标题/列表/加粗/代码块/表格）

          【Schema】
          {
            "goal": "string",
            "steps": [
              { "action": "string", "params": {} }
            ]
          }

          【示例】
          {
            "goal": "示例目标",
            "steps": [
              { "action": "log", "params": { "message": "开始规划" } },
              { "action": "export_flow", "params": { "format": "png" } },
              { "action": "emit", "params": { "data": { "content": "# 标题\\n- 列表项\\n" } } }
            ]
          }
      `
      }
    ]

    if (opts.summary) {
      messages.push({ role: "system", content: `SESSION_SUMMARY:\n${opts.summary}` });
    }
    if (opts.observationDigest) {
      messages.push({ role: "system", content: `SYSTEM_OBSERVATION_DIGEST:\n${opts.observationDigest}` });
    }
  
    messages.push(...(opts.history ?? []));
  
  messages.push({
    role: 'user',
    content:input
  })
  return messages
}
