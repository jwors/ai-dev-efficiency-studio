import 'server-only';
import type { Task } from '@/core/task/types';
import type { SessionState } from '@/core/types';
import { PolicyError, policyGuard, createPolicyContext } from '../security/policyGuard';
import {
  createNodeFileSystemProvider,
  ensureWorkspacePath,
  type FileSystemProvider,
} from './fileSystem';

// 默认使用 Node.js 文件系统
const defaultFsProvider = createNodeFileSystemProvider();

/**
 * 执行单个任务。
 * 根据任务类型执行相应操作，支持 log、emit、web.search、web.fetch、file.write、http 等任务类型。
 * @param task - 待执行的任务
 * @param state - 会话状态
 * @param fsProvider - 文件系统提供者（默认使用 Node.js 文件系统）
 * @returns 任务执行结果
 */
export async function executeTask(
  task: Task,
  state: SessionState,
  fsProvider: FileSystemProvider = defaultFsProvider,
) {
  // 确保策略上下文存在（会话级别隔离）
  if (!state.policyContext) {
    state.policyContext = createPolicyContext();
  }

  try {
    policyGuard(task, state.policyContext);
  } catch (e) {
    const msg = e instanceof PolicyError ? e.message : '任务被安全策略拦截。';
    return {
      fatal: true,
      ok: false,
      type: task.type,
      error: msg,
      output: {
        type: 'emit' as const,
        payload: {
          content: `⚠️ 安全限制：${msg}`,
        },
      },
    };
  }

  switch (task.type) {
    case 'log':
      return {
        type: 'log',
        ok: true,
        message: task.params.message,
      };
    case 'emit': {
      const content = String(task.params?.data?.content ?? '');
      state.observation ??= { emits: [] };
      state.observation.emits.push({
        content,
        at: new Date().toISOString(),
      });
      return {
        type: 'emit',
        ok: true,
        payload: task.params.data,
      };
    }
    case 'web.search': {
      const { query, limit = 5 } = task.params;
      try {
        const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query as string)}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await res.text();

        const items: Array<{ title: string; url: string; snippet?: string }> = [];
        const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;
        let m: RegExpExecArray | null;
        while ((m = linkRe.exec(html)) && items.length < limit) {
          const url = m[1];
          const title = m[2].replace(/<[^>]+>/g, '');
          items.push({ title, url });
        }

        return {
          type: 'web.search',
          ok: res.ok,
          status: res.status,
          data: { items },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { type: 'web.search' as const, ok: false, error: errorMessage };
      }
    }
    case 'web.fetch': {
      const { url } = task.params;
      try {
        const res = await fetch(url as string, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const text = await res.text();
        return { type: 'web.fetch' as const, ok: res.ok, status: res.status, data: { url, content: text.slice(0, 20000) } };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { type: 'web.fetch' as const, ok: false, error: errorMessage };
      }
    }
    case 'file.write': {
      const { path: relPath, content } = task.params;
      const fullPath = ensureWorkspacePath(relPath, fsProvider);
      await fsProvider.fs.ensureDir(fsProvider.path.dirname(fullPath));
      await fsProvider.fs.writeFile(fullPath, content);
      return {
        type: 'file.write',
        ok: true,
        data: { path: relPath },
      };
    }
    case 'artifact.export': {
      const { path: relPath, filename } = task.params;
      const fullPath = ensureWorkspacePath(relPath, fsProvider);
      // 要求文件放在 public/ 下，才可直接下载
      if (!fullPath.includes(`${fsProvider.path.sep}public${fsProvider.path.sep}`)) {
        throw new Error('artifact.export only supports files under public/');
      }
      const urlPath = relPath.replace(/^public[\\/]/, '/').replace(/\\/g, '/');
      return {
        type: 'artifact.export',
        ok: true,
        output: {
          type: 'artifact',
          payload: { url: urlPath, filename },
        },
      };
    }
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
        fatal: !res.ok,
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