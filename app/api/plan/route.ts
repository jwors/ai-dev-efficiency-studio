import { NextResponse } from 'next/server';
import { planner } from '@/core/planner/planner';
import { initLLMOnce } from '@/core/llm/init';

export async function POST(req: Request) { 
	// 调用一次
	initLLMOnce()

	const { input, observation } = await req.json()

	const plan = await planner(input, observation)
	return NextResponse.json(plan)
}