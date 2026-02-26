import { NextResponse } from 'next/server';
import { planner } from '@/core/planner/planner';
import { initLLMOnce } from '@/core/llm/init';
import { getSession } from '@/core/storage/storageMap/map';

export async function POST(req: Request) { 
	// 调用一次
	initLLMOnce()

	const { input, uuid } = await req.json()
	if (!input || !uuid) {
		return NextResponse.json({ error: 'input and uuid are required' }, { status: 400 });
	}
	const observation = await getSession(uuid)
	const plan = await planner(input, observation)
	return NextResponse.json(plan)
}