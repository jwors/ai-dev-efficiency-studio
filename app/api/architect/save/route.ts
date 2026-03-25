import { NextResponse } from 'next/server';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import type { ArchitectureJson } from '@/core/types';

type UpdateArchitectureBody = {
  sessionId?: string;
  architecture?: ArchitectureJson;
};

/**
 * 解析请求体，支持 JSON 和文本格式
 */
async function parseBody(req: Request): Promise<UpdateArchitectureBody> {
  try {
    return (await req.json()) as UpdateArchitectureBody;
  } catch {
    const raw = await req.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw) as UpdateArchitectureBody;
    } catch {
      return {};
    }
  }
}

/**
 * 更新架构数据的 POST 端点
 * 用于保存用户手动编辑后的架构图
 */
export async function POST(req: Request) {
  const body = await parseBody(req);
  const sessionId = body.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  if (!body.architecture) {
    return NextResponse.json({ error: 'architecture is required' }, { status: 400 });
  }

  // 获取现有会话状态
  const state = await getSession(sessionId);

  // 更新架构数据
  state.architecture = body.architecture;

  // 保存到存储
  await saveSession(state);

  return NextResponse.json({ ok: true, sessionId });
}