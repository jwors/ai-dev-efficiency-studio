'use client'

import { useEffect, useRef, useState } from 'react'
import TaskFlow from '@/app/components/taskFlow';
import styles from './taskFlow.module.css'


type PluginResult = {
  name: string;
  ok: boolean;
  error?: string;
};

export default function TaskFlowPluginPage() {
	const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<any>(null);
	
	const handleInputKeyDown = () => {
		
	}

	const handleRun = () => {

	}

	const wbsPlugin = (result?.plugins as PluginResult[] | undefined)?.find(
    (p) => p.name === 'wbs',
  );

	return (
    <main className={`main ${styles.wbsRoot}`}>
      <div className="main-top">
        <section className="panel flow-panel">
          <div className="panel-title">Task Flow任务流程图</div>
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