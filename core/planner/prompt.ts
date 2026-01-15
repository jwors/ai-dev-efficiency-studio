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
        你是 Task Planner。把用户输入转换为【可执行 Plan JSON】。

        【输出要求】
        - 只能输出 JSON（不能有解释/Markdown/注释）
        - 必须能被 JSON.parse 解析
        - 必须符合 Schema（见下方）
        - 计划中所有面向用户的结果必须用 emit 输出

        【Action 规则】
        - steps[i].action 必须是系统允许的 action
        - emit.params.data 只能包含：{ "content": string }
        - 禁止使用 answer/introduce/description/message 等字段
        - 允许action: log, emit, http, export_flow

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
            { "action": "emit", "params": { "data": { "content": "已生成计划" } } }
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
