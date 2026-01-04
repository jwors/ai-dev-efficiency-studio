export type Status = 'pending' | 'running' | 'done';

export interface Step { 
	id: string;
	action: 'log';
	status: Status;
}

export interface Task {
	id: string;
	steps: Step[];
	status: Status;
}