import type { Plugin } from './types';
import { runWbsPlugin } from './wbs';
import { runTaskFlowPlugin } from './taskFlow'
import { runPlanExecutePlugin } from './planExecute';
import { runArchitectPlugin } from './architect';

export const wbsPlugin: Plugin = {
  name: 'wbs',
  run: runWbsPlugin,
};

export const planExecutePlugin: Plugin = {
  name: 'plan-execute',
  run: runPlanExecutePlugin,
};

export const taskFlowPlugin: Plugin = {
  name: 'tf',
  run: runTaskFlowPlugin
}

export const architectPlugin: Plugin = {
  name: 'architect',
  run: runArchitectPlugin,
}