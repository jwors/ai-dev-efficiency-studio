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

export default function WbsPluginPage() {
  const inputRef = useRef<HTMLInputElement>(null);
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

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleRun();
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
        <input
          type="text"
          ref={inputRef}
          className="input"
          placeholder="描述您想要拆解的任务..."
          disabled={loading}
          onKeyDown={handleInputKeyDown}
        />
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
