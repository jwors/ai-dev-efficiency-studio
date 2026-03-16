'use client'

import { useRef, useState } from 'react'
import styles from './architect.module.css'
import { useAuthUserId } from '@/lib/hooks/useAuthUserId';
import { ArchitectureFlow } from '@/app/components/ArchitectureFlow';
import type { ArchitectureJson } from '@/core/types';

type PluginResult = {
  name: string;
  ok: boolean;
  error?: string;
};

type ArchitectApiResponse = {
  architecture: ArchitectureJson | null;
  plugins?: PluginResult[];
  sessionId?: string;
};

const QUICK_EXAMPLES = [
  { label: '后台管理系统', text: '搭建一个后台管理系统，需要用户管理、权限控制、数据统计功能' },
  { label: '电商平台', text: '设计一个电商平台，包含用户、商品、订单、支付模块，需要高并发支持' },
  { label: '博客系统', text: '开发一个博客系统，支持文章发布、评论、搜索功能' },
  { label: '微服务 SaaS', text: '设计一个微服务架构的 SaaS 平台，包含租户管理、计费、通知服务' },
];

export default function ArchitectPluginPage() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArchitectApiResponse | null>(null);
  const { userId } = useAuthUserId();
  const sessionId = userId ? `${userId}:architect` : '';

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleRun();
    }
  }

  function handleExampleClick(text: string) {
    if (inputRef.current) {
      inputRef.current.value = text;
      inputRef.current.focus();
    }
  }

  async function handleRun() {
    const input = inputRef.current?.value;
    if (!input) {
      setError('请输入需求描述');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/architect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, uuid: sessionId }),
      })
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  const architectPlugin = (result?.plugins as PluginResult[] | undefined)?.find(
    (p) => p.name === 'architect',
  );

  return (
    <main className={`main ${styles.architectRoot}`}>
      <div className="main-top">
        <section className="panel flow-panel" style={{ animationDelay: '0ms' }}>
          <div className="panel-title">
            <span>系统架构图</span>
            {result?.architecture && (
              <span style={{ fontSize: '11px', opacity: 0.6 }}>
                {result.architecture.components?.length || 0} 个组件 · {result.architecture.techStack?.length || 0} 项技术栈
              </span>
            )}
          </div>
          <div className="flow-wrap">
            <ArchitectureFlow architecture={result?.architecture ?? null} />
          </div>
        </section>
      </div>

      <section className="panel input-panel" style={{ animationDelay: '50ms' }}>
        <div className="panel-title">
          <span>需求描述</span>
          {loading && <span style={{ fontSize: '11px', opacity: 0.7 }}>生成中...</span>}
        </div>
        <textarea
          ref={inputRef}
          className="input"
          placeholder="描述您想要构建的系统（Shift+Enter 换行）..."
          disabled={loading}
          onKeyDown={handleInputKeyDown}
          rows={4}
        />
        <div className="examples">
          <span className="examples-label">快捷示例：</span>
          <div className="examples-list">
            {QUICK_EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                className="example-tag"
                onClick={() => handleExampleClick(example.text)}
                disabled={loading}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
        <div className="actions">
          <button
            className="button button-primary"
            onClick={handleRun}
            disabled={loading}
          >
            {loading ? '生成中...' : '生成架构图'}
          </button>
        </div>
        <div className="status">
          {loading ? 'AI 正在设计系统架构...' : '输入需求描述，AI 将为您生成系统架构设计'}
        </div>
        {error && <div className="status errmsg">{error}</div>}
        {architectPlugin && !architectPlugin.ok && (
          <div className="status errmsg">
            架构图插件执行失败: {architectPlugin.error ?? '未知错误'}
          </div>
        )}
      </section>

      {/* 技术栈展示 */}
      {result?.architecture?.techStack && result.architecture.techStack.length > 0 && (
        <section className="panel" style={{ animationDelay: '100ms', marginTop: '16px' }}>
          <div className="panel-title">
            <span>技术栈</span>
          </div>
          <div className={styles.techStack}>
            {result.architecture.techStack.map((tech, index) => (
              <div key={index} className={styles.techItem}>
                <div className={styles.techCategory}>{tech.category}</div>
                <div className={styles.techName}>
                  {tech.name}
                  {tech.version && <span className={styles.techVersion}>v{tech.version}</span>}
                </div>
                {tech.reason && <div className={styles.techReason}>{tech.reason}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 架构决策展示 */}
      {result?.architecture?.decisions && result.architecture.decisions.length > 0 && (
        <section className="panel" style={{ animationDelay: '150ms', marginTop: '16px' }}>
          <div className="panel-title">
            <span>架构决策</span>
          </div>
          <div className={styles.decisions}>
            {result.architecture.decisions.map((decision, index) => (
              <div key={index} className={styles.decisionItem}>
                <div className={styles.decisionTopic}>{decision.topic}</div>
                <div className={styles.decisionChoice}>
                  <span className={styles.decisionLabel}>选择：</span>
                  {decision.choice}
                </div>
                <div className={styles.decisionReason}>
                  <span className={styles.decisionLabel}>理由：</span>
                  {decision.reason}
                </div>
                {decision.alternatives && decision.alternatives.length > 0 && (
                  <div className={styles.decisionAlternatives}>
                    <span className={styles.decisionLabel}>备选：</span>
                    {decision.alternatives.join('、')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}