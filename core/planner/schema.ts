import { z } from 'zod';

export const PlanSchema = z.object({
	goal: z.string(),
	steps: z.array(
		z.object({
			action: z.enum(['log']),
			params: z.record(z.string(), z.any()).optional(),
		})
	)
})
export type Plan = z.infer<typeof PlanSchema>;