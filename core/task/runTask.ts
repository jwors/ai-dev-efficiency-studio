import { Task } from "./types";
import { runStep } from "../executor";

export async function runTask(task: Task) {
	task.status = 'running'

	for (const step of task.steps) {
		await runStep(step);
	}

	task.status = 'done';
}