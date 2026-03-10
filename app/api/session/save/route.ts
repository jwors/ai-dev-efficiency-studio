import { NextResponse } from 'next/server';
import { getSession, saveSession } from '@/core/storage/storageMap/map';

type SaveSessionBody = {
  sessionId?: string;
};

/**
 * 解析请求体，支持 JSON 和文本格式。
 * @param req - 请求对象
 * @returns 解析后的请求体对象
 */
async function parseBody(req: Request): Promise<SaveSessionBody> {
  try {
    return (await req.json()) as SaveSessionBody;
  } catch {
    const raw = await req.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw) as SaveSessionBody;
    } catch {
      return {};
    }
  }
}

/**
 * 保存会话状态的 POST 端点。
 * @param req - 请求对象，包含 sessionId
 * @returns 保存结果
 */
export async function POST(req: Request) {
  const body = await parseBody(req);
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const state = await getSession(sessionId);
  await saveSession(state);

  return NextResponse.json({ ok: true, sessionId });
}
