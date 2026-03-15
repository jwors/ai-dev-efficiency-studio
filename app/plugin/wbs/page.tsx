'use client';

import { useEffect, useRef, useState } from 'react';
import WbsFlow from '@/app/components/Wbs';
import { useAuthUserId } from '@/lib/hooks/useAuthUserId';
import styles from './wbs.module.css';

type PluginResult = {
  name: string;
  ok: boolean;
  error?: string;
};

const QUICK_EXAMPLES = [
  { label: '电商项目', text: '开发一个电商平台，包含用户系统、商品管理、订单系统、支付模块' },
  { label: 'APP 开发', text: '设计一个社交 APP，包含用户注册登录、好友系统、消息聊天、动态发布功能' },
  { label: '企业系统', text: '搭建企业内部管理系统，包含员工管理、考勤系统、审批流程、报表统计' },
];

export default function WbsPluginPage() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const { userId } = useAuthUserId();
  const sessionId = userId ? `${userId}:wbs` : '';

  useEffect(() => {
    if (!sessionId) return;

    const flushSession = () => {
      const payload = JSON.stringify({ sessionId });
      const ok = navigator.sendBeacon?.('/api/session/save', payload);
      if (!ok) {
        void fetch('/api/session/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSession();
      }
    };

    window.addEventListener('pagehide', flushSession);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushSession);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [sessionId]);


  async function handleRun() {
    const input = inputRef.current?.value;
    if (!input) {
      setError('请输入任务描述');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/wbs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, uuid: sessionId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

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

  const wbsPlugin = (result?.plugins as PluginResult[] | undefined)?.find(
    (p) => p.name === 'wbs',
  );

  return (
    <main className={`main ${styles.wbsRoot}`}>
      <div className="main-top">
        <section className="panel flow-panel" style={{ animationDelay: '0ms' }}>
          <div className="panel-title">
            <span>WBS 任务拆解图</span>
            {result?.wbs && (
              <span style={{ fontSize: '11px', opacity: 0.6 }}>
                {result.wbs.nodes?.length || 0} 个节点
              </span>
            )}
          </div>
          <div className="flow-wrap">
            <WbsFlow wbs={result?.wbs ?? null} />
          </div>
        </section>
      </div>

      <section className="panel input-panel" style={{ animationDelay: '50ms' }}>
        <div className="panel-title">
          <span>任务输入</span>
          {loading && <span style={{ fontSize: '11px', opacity: 0.7 }}>生成中...</span>}
        </div>
        <textarea
          ref={inputRef}
          className="input"
          placeholder="描述您想要拆解的任务（Shift+Enter 换行）..."
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
            {loading ? '生成中...' : '生成 WBS'}
          </button>
        </div>
        <div className="status">
          {loading ? 'AI 正在分析任务结构...' : '准备好生成任务拆解图'}
        </div>
        {error && <div className="status errmsg">{error}</div>}
        {wbsPlugin && !wbsPlugin.ok && (
          <div className="status errmsg">
            WBS 插件执行失败: {wbsPlugin.error ?? '未知错误'}
          </div>
        )}
      </section>
    </main>
  );
}
