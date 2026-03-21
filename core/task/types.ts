import 'server-only';
import {z} from 'zod'

/**
 * 任务动作类型枚举。
 * 定义所有支持的任务动作类型。
 */
export const Action = z.enum([
  'log',
  'emit',
  'http',
  'export_flow',
  'web.search',
  'web.fetch',
  'file.write',
  'artifact.export',
]);

/**
 * 日志任务类型。
 * 用于记录日志消息。
 */
export type LogTask = {
  type: 'log';
  params: {
    message: string;
  };
};

/**
 * 发送任务类型。
 * 用于向用户发送内容。
 */
export type EmitTask = {
  type: 'emit';
  params: {
    data: { content: string };
  };
};

/**
 * HTTP 请求任务类型。
 * 用于发送 HTTP 请求。
 */
export type HttpTask = {
  type: 'http';
  params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
};

/**
 * 导出流程图任务类型。
 * 用于导出流程图为图片文件。
 */
export type ExportFlowTask = {
  type: 'export_flow',
  params?: {
    format?: 'png' | 'svg';     // 先 png 就够
    filename?: string;          // e.g. "plan-flow.png"
  };
}

/**
 * 网页搜索任务类型。
 * 用于在互联网上搜索信息。
 */
export type WebSearchTask = {
  type: 'web.search';
  params: {
    query: string;
    domains?: string[];
    limit?: number;
  };
};

/**
 * 网页抓取任务类型。
 * 用于获取网页内容。
 */
export type WebFetchTask = {
  type: 'web.fetch';
  params: {
    url: string;
  };
};

/**
 * 文件写入任务类型。
 * 用于将内容写入文件。
 */
export type FileWriteTask = {
  type: 'file.write';
  params: {
    path: string;
    content: string;
  };
};

/**
 * 制品导出任务类型。
 * 用于导出制品供用户下载。
 */
export type ArtifactExportTask = {
  type: 'artifact.export';
  params: {
    path: string;
    filename: string;
  };
};

/**
 * 任务类型联合。
 * 汇总所有可能的任务类型。
 */
export type Task =
  | LogTask
  | EmitTask
  | HttpTask
  | ExportFlowTask
  | WebFetchTask
  | WebSearchTask
  | FileWriteTask
  | ArtifactExportTask
