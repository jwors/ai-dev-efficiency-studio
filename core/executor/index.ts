import 'server-only';
import type { Task } from '@/core/task/types';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SessionState } from '../types/type';
import { PolicyError, policyGuard } from '../security/policyGuard';

const workspaceRoot = path.resolve(process.cwd());

function ensureWorkspacePath(filePath: string) {
  const resolved = path.resolve(workspaceRoot, filePath);
  // 防止路径逃逸到仓库之外
  if (!resolved.startsWith(workspaceRoot)) {
    throw new Error('路径超出工作目录，不允许访问');
  }
  return resolved;
}

export async function executeTask(task: Task, state: SessionState) {
  try {
    policyGuard(task)
  } catch(e) {
    const msg = e instanceof PolicyError ? e.message : '任务被安全策略拦截。';
    return {
      ok: false,
      type: task.type,
      error:msg,
      output: {
        type:'emit',
        payload: {
          content:`⚠️ 安全限制：${msg}`
        }
      }
    }
  }
  switch (task.type) {
    case 'log':
      return {
        type: 'log',
        ok: true,
        message: task.params.message,
      };
    case 'emit':
      const content = String(task.params?.data?.content ?? "");
      state.observation ??= {emits:[]}
      state.observation.emits.push({
        content,
        at:new Date().toISOString()
      })
      return {
        type: 'emit',
        ok: true,
        data:task.params.data
      };
    case 'http': {
      const { url, method = 'GET', headers = {}, body } = task.params;
      const finalHeaders: Record<string, string> = { ...headers };
      const hasJsonBody =
        body !== undefined &&
        typeof body === 'object' &&
        !(body instanceof ArrayBuffer) &&
        !(body instanceof Blob) &&
        !(body instanceof FormData);
      if (hasJsonBody && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: hasJsonBody ? JSON.stringify(body) : (body as BodyInit | undefined),
      });
      const contentType = res.headers.get('content-type') ?? '';
      const responseBody =
        contentType.includes('application/json')
          ? await res.json()
          : await res.text();
      return {
        type: 'http',
        ok: res.ok,
        status: res.status,
        data: responseBody,
      };
    }
    case 'export_flow':
      return {
        ok: true,
        type: 'export_flow' as const,
        artifact: {
          kind: task.params?.format ?? 'png',
          filename: task.params?.filename ?? 'plan-flow.png',
        },
      };
    default:
      throw new Error('Unhandled task');
  }
}
