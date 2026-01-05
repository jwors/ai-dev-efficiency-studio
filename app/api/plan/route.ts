import { NextResponse } from 'next/server';
import { planner } from '@/core/planner/planner';
import { initLLMOnce } from '@/core/llm/init';

export async function POST(req: Request) { 
	console.log('diaoyon')
	// 调用一次
	initLLMOnce()

	const { input } = await req.json()

	const plan = await planner(input)
	return NextResponse.json(plan)
}