import { Message } from '../types/type';


export function buildPlannerMessages(params: {
  system: string;
  summary: string;
  history: Message[];
  input: string;
}): Message[] {
  const msgs: Message[] = [
    { role: "system", content: params.system },
  ];

  if (params.summary.trim()) {
    msgs.push({ role: "system", content: `SESSION_SUMMARY:\n${params.summary}` });
  }

  msgs.push(...params.history);
  msgs.push({ role: "user", content: params.input });

  return msgs;
}
