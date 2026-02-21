import { NextResponse } from 'next/server';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import { inputGuard } from '@/core/security/inputGuard';
import { runPlugins } from '@/core/plugins/runPlugins';
import { wbsPlugin } from '@/core/plugins';
import { updateSession } from '@/core/basic/updateSession';

export async function POST(req: Request) {
	initLLMOnce();
	const { input, uuid }: { input: string; uuid: string } = await req.json();
  const blocked = inputGuard(input);
  if (blocked) {
    return NextResponse.json(
      { error: blocked.payload.content as string },
      { status: 400 },
    );
	}
	const state = await getSession(uuid);
  await updateSession(input, state);
}