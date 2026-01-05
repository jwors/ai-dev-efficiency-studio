import 'server-only';
import { z } from 'zod';
import { Action } from '../llm/types';


export const StepSchema = z.object({
  action: Action,
	params: z.record(z.string(), z.any()).optional(),
});

export const PlanSchema = z.object({
	goal: z.string(),
	steps:z.array(StepSchema) 
})
export type Plan = z.infer<typeof PlanSchema>;