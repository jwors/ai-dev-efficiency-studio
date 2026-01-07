import 'server-only';
import type { Observation } from '../agent/observation';

export function plannerPrompt(input: string, observation?: Observation) {
  const serializedObservation =
    observation !== undefined
      ? JSON.stringify(observation, null, 2)
      : JSON.stringify({ outputs: [] });

  return `
你是一个任务规划器（Task Planner），你的职责是把用户输入转化为【可执行的 JSON 指令计划】。

【强制规则】：
1. 你必须【只返回 JSON】，不能包含任何解释、注释、Markdown 或多余文本
2. 返回内容必须是一个 JSON 对象
3. JSON 必须可以被 JSON.parse 正确解析
4. 严格遵守下面给定的 Schema
5. 如果无法生成计划，也必须返回合法 JSON

当需要向用户交付最终可用结果时，
请使用名为 "emit" 的 action，并将结构化结果放入 params.data 中。

【允许的 action 列表】：
- log：输出调试/中间信息，params.message 为字符串
- emit：向用户返回最终结构化结果，params.data 为任意结构
- http：发起 HTTP 请求，必须提供 params.url，可选 params.method/headers/body

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

【可用上下文 Observation】：
${serializedObservation}

【用户输入】：
${input}
`;
}
