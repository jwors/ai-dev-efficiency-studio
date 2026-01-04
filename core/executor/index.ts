import { Step } from "../task/types";

export const runStep = async (step: Step) => {
	step.status = 'running';
	console.log('running step', step.id);
	await new Promise(resolve => setTimeout(resolve, 1000));
	step.status = 'done';
}
