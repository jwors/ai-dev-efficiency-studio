import 'server-only';
import { z } from 'zod';
import { Action } from '../llm/types';


export const StepSchema = z.object({
  action: Action,
	params: z.record(z.string(), z.unknown()).optional(),
});

export const PlanSchema = z.object({
	goal: z.string(),
	steps: z.array(StepSchema),
	meta: z.object({
		id: z.string(),
		model: z.string(),
		created: z.number(),
	}).optional(),
	directResponse: z.string().optional(), // LLM 直接返回的内容（非 JSON 格式）
})
export type Plan = z.infer<typeof PlanSchema>;