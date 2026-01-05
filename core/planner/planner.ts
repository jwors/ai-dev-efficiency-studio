import { PlanSchema } from './schema';

export async function planner(input: string) { 
	const raw = {
		goal: input,
		steps: [
			{
				action: 'log',
				params: {
					message: 'step 1',
				},
			},
			{
				action: 'log',
				params: {
					message: 'step 2',
				},
			},
		],
	}
	const plan = PlanSchema.parse(raw);
	return plan;
}
