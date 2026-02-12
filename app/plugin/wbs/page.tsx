'use client';

import { useEffect, useRef, useState } from 'react';
import TaskFlow from '@/app/components/taskFlow';
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
  const sessionId = userId ? `${userId}_wbs` : '';

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
      setError('Please enter a task description.');
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
      setError(err instanceof Error ? err.message : 'Request failed');
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
        <section className="panel flow-panel">
          <div className="panel-title">WBS 任务拆解图</div>
          <TaskFlow wbs={result?.wbs ?? null} />
        </section>
      </div>

      <section className="panel input-panel">
        <div className="panel-title">Input Container</div>
        <input
          type="text"
          ref={inputRef}
          className="input"
          placeholder="Describe the task you want to execute"
          disabled={loading}
          onKeyDown={handleInputKeyDown}
        />
        <div className="actions">
          <button
            className="button button-primary"
            onClick={handleRun}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run Task'}
          </button>
        </div>
        <div className="status">
          {loading ? 'Generating WBS...' : 'Ready to build a WBS.'}
        </div>
        {error && <div className="status errmsg">Error: {error}</div>}
        {wbsPlugin && !wbsPlugin.ok && (
          <div className="status errmsg">
            WBS plugin failed: {wbsPlugin.error ?? 'Unknown error'}
          </div>
        )}
      </section>
    </main>
  );
}
