'use client'

import { useRef, useState } from 'react'
import styles from './taskFlow.module.css'
import { useAuthUserId } from '@/lib/hooks/useAuthUserId';
import { TaskFlow } from '@/app/components/taskFlow';
import type { FlowchartGraph } from '@/core/plugins/taskFlow/schema';

type PluginResult = {
  name: string;
  ok: boolean;
  error?: string;
};

type TaskFlowApiResponse = {
  tf: FlowchartGraph | null;
  plugins?: PluginResult[];
  sessionId?: string;
};

export default function TaskFlowPluginPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TaskFlowApiResponse | null>(null);
  const { userId } = useAuthUserId();
  const sessionId = userId ? `${userId}:tf` : '';

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleRun();
    }
  }

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
      const response = await fetch('/api/taskFlow', {
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
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  const tf = (result?.plugins as PluginResult[] | undefined)?.find(
    (p) => p.name === 'tf',
  );

  return (
    <main className={`main ${styles.wbsRoot}`}>
      <div className="main-top">
        <section className="panel flow-panel">
          <div className="panel-title">Task Flow</div>
          <TaskFlow tf={result?.tf ?? null} />
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
          {loading ? 'Generating tf...' : 'Ready to build a tf.'}
        </div>
        {error && <div className="status errmsg">Error: {error}</div>}
        {tf && !tf.ok && (
          <div className="status errmsg">
            tf plugin failed: {tf.error ?? 'Unknown error'}
          </div>
        )}
      </section>
    </main>
  );
}
