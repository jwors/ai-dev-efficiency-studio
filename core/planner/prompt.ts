// core/planner/prompt.ts
export function plannerPrompt(input: string) {
  return `
You are a task planner in an execution system.

User goal:
${input}

Rules:
- Output JSON only
- Do NOT explain
- Do NOT generate code
- Only use allowed actions
- Keep steps minimal and deterministic

Allowed actions:
- log

Output format:
{
  "goal": string,
  "steps": [
    {
      "action": "log",
      "params": { "message": string }
    }
  ]
}
`;
}
