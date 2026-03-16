/**
 * 架构图生成 POC - 真实 LLM API 测试
 *
 * 使用方式：
 * npm test -- test/architect-real-api.test.ts
 *
 * 注意：此测试需要真实的 QWEN_API_KEY
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initLLMOnce } from '../core/llm/init';
import { callLLM } from '../core/llm';
import { architectPrompt } from '../core/plugins/architect/prompt';
import { ArchitectureSchema } from '../core/plugins/architect/schema';
import type { SessionState, ArchitectureJson } from '../core/types';

// 创建模拟的 SessionState
function createMockState(): SessionState {
  return {
    sessionId: 'test:architect-real:001',
    summary: '',
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('Architect Plugin - Real API Test', () => {
  beforeAll(() => {
    // 初始化 LLM
    initLLMOnce();
  });

  it('应该成功生成后台管理系统架构', async () => {
    const input = '搭建一个后台管理系统，需要用户管理、权限控制、数据统计功能';
    const state = createMockState();
    const messages = architectPrompt(input, state);

    console.log(`\n📝 测试输入: ${input}`);

    const startTime = Date.now();
    const response = await callLLM(messages);
    const elapsed = Date.now() - startTime;

    console.log(`⏱️  LLM 响应时间: ${elapsed}ms`);
    console.log(`📊 Provider: ${response.meta.provider}`);

    // 解析 JSON
    let json: unknown;
    try {
      json = JSON.parse(response.content);
    } catch (e) {
      console.error('❌ JSON 解析失败');
      console.error('原始响应前 500 字符:');
      console.error(response.content.slice(0, 500));
      expect.fail('JSON parse error');
    }

    // 验证 Schema
    const parsed = ArchitectureSchema.safeParse(json);
    if (!parsed.success) {
      console.error('❌ Schema 验证失败');
      console.error('错误:', parsed.error.issues.slice(0, 3));
      expect.fail('Schema validation error');
    }

    const arch = parsed.data as ArchitectureJson;
    console.log(`✅ 架构生成成功!`);
    console.log(`  - 标题: ${arch.title}`);
    console.log(`  - 架构风格: ${arch.style}`);
    console.log(`  - 组件数量: ${arch.components.length}`);
    console.log(`  - 连接数量: ${arch.connections.length}`);
    console.log(`  - 技术栈数量: ${arch.techStack.length}`);

    // 打印组件列表
    console.log('\n📦 组件列表:');
    arch.components.forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.type}] ${c.name} (${c.technology || 'N/A'})`);
    });

    // 基本验证
    expect(arch.title).toBeTruthy();
    expect(arch.components.length).toBeGreaterThan(0);
    expect(arch.techStack.length).toBeGreaterThan(0);

    // 组件类型验证
    const types = arch.components.map(c => c.type);
    expect(types).toContain('frontend');
    expect(types).toContain('backend');
  }, 60000);

  it('应该成功生成电商平台架构', async () => {
    const input = '设计一个电商平台，包含用户、商品、订单、支付模块';
    const state = createMockState();
    const messages = architectPrompt(input, state);

    console.log(`\n📝 测试输入: ${input}`);

    const startTime = Date.now();
    const response = await callLLM(messages);
    const elapsed = Date.now() - startTime;

    console.log(`⏱️  LLM 响应时间: ${elapsed}ms`);

    // 解析 JSON
    const json = JSON.parse(response.content);
    const parsed = ArchitectureSchema.safeParse(json);

    expect(parsed.success).toBe(true);

    if (parsed.success) {
      const arch = parsed.data;
      console.log(`✅ 架构生成成功: ${arch.title}`);
      console.log(`  - 组件数量: ${arch.components.length}`);

      expect(arch.components.length).toBeGreaterThan(0);
    }
  }, 60000);
});