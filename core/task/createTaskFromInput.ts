import { planner } from "../planner/planner";
import { Task } from "./types";
import { nanoid } from 'nanoid';

export async function createTaskFromInput(input: string): Promise<Task> { 
	const plan = await planner(input);
	return {
		id: nanoid(),
		status: 'pending',
		steps: plan.steps.map(step => ({
			id: nanoid(),
			action: step.action,
			status: 'pending',
		})),
	}
}