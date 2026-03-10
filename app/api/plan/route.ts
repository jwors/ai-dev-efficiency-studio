import { NextResponse } from 'next/server';
import { planner } from '@/core/planner/planner';
import { initLLMOnce } from '@/core/llm/init';
import { getSession } from '@/core/storage/storageMap/map';

/**
 * 处理计划生成请求的 POST 端点。
 * 根据用户输入生成执行计划。
 * @param req - 请求对象，包含 input 和 uuid
 * @returns 生成的计划 JSON 对象
 */
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