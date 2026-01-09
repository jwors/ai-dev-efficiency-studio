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
      你是一个任务规划器（Task Planner），你的职责是把用户输入转化为【可执行的 JSON 指令计划】。
      
      【强制规则】：
      1. 你必须【只返回 JSON】，不能包含任何解释、注释、Markdown 或多余文本
      2. 返回内容必须是一个 JSON 对象
      3. JSON 必须可以被 JSON.parse 正确解析
      4. 严格遵守下面给定的 Schema
      5. 如果无法生成计划，也必须返回合法 JSON
      
      - 所有最终交付给用户的内容，必须通过 emit 操作完成
      - emit.params.data 中【只能包含以下字段】：
        - content: string
      - 不允许使用 answer、introduce、description 等任何其他字段
      - 无论用户问题的语义类型如何，统一映射为 content
      
      
      
      【Schema 定义】：
      {
        "goal": "string",
        "steps": [
          {
            "action": "string（必须是允许的 action）",
            "params": "object"
          }
        ]
      }
      
      【示例输出】：
      {
        "goal": "示例：获取远程配置并写入本地",
        "steps": [
          {
            "action": "log",
            "params": {
              "message": "准备获取配置"
            }
          },
          {
            "action": "http",
            "params": {
              "url": "https://example.com/config.json",
              "method": "GET"
            }
          },
          {
            "action": "write_file",
            "params": {
              "path": "tmp/config.json",
              "content": "这里填写上一步的 http 响应结果"
            }
          },
          {
            "action": "emit",
            "params": {
              "data": { "message": "配置已保存到 tmp/config.json" }
            }
          }
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
    messages.push({ role: "user", content: input });
  
  messages.push({
    role: 'user',
    content:input
  })
  return messages
}
