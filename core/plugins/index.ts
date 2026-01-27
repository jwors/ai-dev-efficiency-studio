import type { Plugin } from './types';
import { runWbsPlugin } from './wbs';

export const wbsPlugin: Plugin = {
  name: 'wbs',
  run: runWbsPlugin,
};
