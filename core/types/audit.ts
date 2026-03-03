export interface Evidence {
	id: string;
	type: 'web.search' | 'web.fetch' | 'file.read' | 'file.write' | 'api' | 'internal';
	source: string;
	title?: string;
	accessedAt: string;
	snippet?: string;
	content?: string;
	hash?: string;
	metadata?: {
		httpStatus?: number;
		contentType?: string;
		fileSize?: number;
		method?: string;
		resultCount?:number;
	};
}

/**
 * 可审计步骤结果
 */
export interface AuditableStep {
	stepIndex: number;
	action: string;
	ok: boolean;
	output?: string;
	evidenceIds: string[];
	executedAt: string;
	durationMs?: number;
	error?: string;
}

/**
 * 引用条目
 */
export interface Citation {
	number: number;
	evidence: Evidence;
}

/**
 * 审计报告
 */
export interface AuditReport {
	id: string;
	query: string;
	executedAt: string;
	planId: string;
	steps: AuditableStep[];
	sources: Evidence[];
	citations: Citation[];
	stats: {
		totalSteps: number;
		successfulSteps: number;
		failedSteps: number;
		totalSources: number;
	};
}

/**
 * 证据收集器状态
 */
export interface EvidenceState {
	items: Evidence[];
	sourceMap: Map<string, string>;
	citationCounter: number;
}