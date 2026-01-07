import 'server-only';
import type { Task } from '@/core/task/types';
import fs from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = path.resolve(process.cwd());

function ensureWorkspacePath(filePath: string) {
  const resolved = path.resolve(workspaceRoot, filePath);
  // 防止路径逃逸到仓库之外
  if (!resolved.startsWith(workspaceRoot)) {
    throw new Error('路径超出工作目录，不允许访问');
  }
  return resolved;
}

export async function executeTask(task: Task) {
  switch (task.type) {
    case 'log':
      console.log(task.params.message);
      return {
        type: 'log',
        ok: true,
        message: task.params.message,
      };
    case 'emit':
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
    default:
      throw new Error('Unhandled task');
  }
}
