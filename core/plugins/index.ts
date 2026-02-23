import type { Plugin } from './types';
import { runWbsPlugin } from './wbs';
import { runTaskFlowPlugin } from './taskFlow'
import { runPlanExecutePlugin } from './planExecute';

export const wbsPlugin: Plugin = {
  name: 'wbs',
  run: runWbsPlugin,
};

export const planExecutePlugin: Plugin = {
  name: 'plan-execute',
  run: runPlanExecutePlugin,
};

export const taskFlowPlugin: Plugin = {
  name: 'TF',
  run: runTaskFlowPlugin
}