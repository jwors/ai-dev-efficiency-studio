/**
 * 架构图生成 POC - 真实 LLM API 测试
 *
 * 使用方式：
 * 1. 设置环境变量：QWEN_API_KEY=your_api_key
 * 2. 运行：npx tsx test/architect-real-test.ts
 *
 * 注意：此脚本需要真实的 LLM API Key
 */

import { initLLMOnce } from '../core/llm/init';
import { callLLM } from '../core/llm';
import { architectPrompt } from '../core/plugins/architect/prompt';
import { ArchitectureSchema } from '../core/plugins/architect/schema';
import type { SessionState } from '../core/types';

// 测试用例
const TEST_INPUTS = [
  '搭建一个后台管理系统，需要用户管理、权限控制、数据统计功能',
  '设计一个电商平台，包含用户、商品、订单、支付模块',
  '开发一个博客系统，支持文章发布、评论、搜索功能',
  '设计一个微服务架构的 SaaS 平台，包含租户管理、计费、通知服务',
];

function createMockState(): SessionState {
  return {
    sessionId: 'test:architect-real:001',
    summary: '',
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function testArchitectureGeneration(input: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`📝 测试输入: ${input}`);
  console.log('='.repeat(60));

  const state = createMockState();
  const messages = architectPrompt(input, state);

  console.log('\n📨 Prompt 消息数量:', messages.length);

  try {
    const startTime = Date.now();
    const response = await callLLM(messages);
    const elapsed = Date.now() - startTime;

    console.log('\n⏱️  LLM 响应时间:', elapsed, 'ms');
    console.log('📊 Token 使用:', response.meta);

    // 尝试解析 JSON
    let json: unknown;
    try {
      json = JSON.parse(response.content);
    } catch (e) {
      console.error('\n❌ JSON 解析失败');
      console.error('原始响应前 500 字符:');
      console.error(response.content.slice(0, 500));
      return { success: false, error: 'JSON parse error' };
    }

    // 验证 Schema
    const parsed = ArchitectureSchema.safeParse(json);
    if (!parsed.success) {
      console.error('\n❌ Schema 验证失败');
      console.error('错误:', parsed.error.issues.slice(0, 3));
      return { success: false, error: 'Schema validation error' };
    }

    const arch = parsed.data;
    console.log('\n✅ 架构生成成功!');
    console.log('  - 标题:', arch.title);
    console.log('  - 架构风格:', arch.style);
    console.log('  - 组件数量:', arch.components.length);
    console.log('  - 连接数量:', arch.connections.length);
    console.log('  - 技术栈数量:', arch.techStack.length);

    // 打印组件列表
    console.log('\n📦 组件列表:');
    arch.components.forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.type}] ${c.name} (${c.technology || 'N/A'})`);
    });

    // 打印技术栈
    console.log('\n🔧 技术栈:');
    arch.techStack.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.category}: ${t.name} ${t.version || ''} - ${t.reason || ''}`);
    });

    // 打印决策
    if (arch.decisions && arch.decisions.length > 0) {
      console.log('\n📋 架构决策:');
      arch.decisions.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.topic}: ${d.choice}`);
        console.log(`     理由: ${d.reason}`);
      });
    }

    return { success: true, data: arch };
  } catch (error) {
    console.error('\n❌ LLM 调用失败:', error);
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log('🚀 架构图生成 POC - 真实 LLM API 测试');
  console.log('环境检查:');
  console.log('  - LLM_PROVIDER:', process.env.LLM_PROVIDER || 'qwen');
  console.log('  - QWEN_API_KEY:', process.env.QWEN_API_KEY ? '已设置' : '❌ 未设置');

  if (!process.env.QWEN_API_KEY && process.env.LLM_PROVIDER !== 'mock') {
    console.error('\n❌ 错误: 请设置 QWEN_API_KEY 环境变量');
    console.error('示例: QWEN_API_KEY=your_key npx tsx test/architect-real-test.ts');
    process.exit(1);
  }

  // 初始化 LLM
  initLLMOnce();
  console.log('  - LLM 初始化: ✅');

  const results = [];

  for (const input of TEST_INPUTS) {
    const result = await testArchitectureGeneration(input);
    results.push({ input, ...result });

    // 等待一下，避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 汇总结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.success).length;
  console.log(`\n成功: ${successCount}/${results.length}`);

  results.forEach((r, i) => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${i + 1}. ${status} ${r.input.slice(0, 30)}...`);
  });
}

main().catch(console.error);