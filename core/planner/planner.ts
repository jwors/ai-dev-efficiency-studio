import { PlanSchema } from './schema';
import { plannerPrompt } from './prompt';
import { callLLM } from '../llm';

export async function planner(input: string) { 
	const prompt = plannerPrompt(input);
	const rawText = await callLLM(prompt);
	let rawJson: unknown;
	try {
    rawJson = JSON.parse(rawText);
  } catch {
    throw new Error('AI output is not valid JSON');
  }

  const plan = PlanSchema.parse(rawJson);
  return plan;
}
