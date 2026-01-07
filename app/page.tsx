'use client';

import { useRef, useState } from 'react';
import ReactFlow, { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

type Flow = {
  nodes: Node[];
  edges: Edge[];
};

type ExecutionResult = {
  stepIndex: number;
  type?: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [flow, setFlow] = useState<Flow | null>(null);

  function buildFlow(data: any): Flow {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const stepGap = 120;
    const baseX = 40;
    const results: ExecutionResult[] = Array.isArray(data?.results)
      ? data.results
      : [];
    const errorSteps = new Set<number>();
    results.forEach((item) => {
      if (!item.ok && typeof item.stepIndex === 'number') {
        errorSteps.add(item.stepIndex);
      }
    });

    nodes.push({
      id: 'input',
      data: { label: 'User Input' },
      position: { x: baseX, y: 0 },
    });

    nodes.push({
      id: 'planner',
      data: { label: `Goal: ${data.plan?.goal ?? 'N/A'}` },
      position: { x: baseX, y: stepGap },
    });

    edges.push({
      id: 'e-input-planner',
      source: 'input',
      target: 'planner',
    });

    const steps = Array.isArray(data.plan?.steps) ? data.plan.steps : [];
    steps.forEach((step: any, index: number) => {
      const stepId = `step-${index}`;
      const isError = errorSteps.has(index);

      nodes.push({
        id: stepId,
        data: { label: `${index + 1}. ${step.action}` },
        position: { x: baseX, y: stepGap * (index + 2) },
        style: isError
          ? { border: '1px solid #ff6b6b', color: '#ff6b6b' }
          : undefined,
      });

      edges.push({
        id: `e-${index}`,
        source: index === 0 ? 'planner' : `step-${index - 1}`,
        target: stepId,
      });
    });

    const outputs = Array.isArray(data.outputs) ? data.outputs : [];
    if (outputs.length > 0) {
      nodes.push({
        id: 'output',
        data: { label: `Output (${outputs.length})` },
        position: { x: baseX, y: stepGap * (steps.length + 2) },
      });

      edges.push({
        id: 'e-output',
        source: steps.length ? `step-${steps.length - 1}` : 'planner',
        target: 'output',
      });
    }

    return { nodes, edges };
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
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setFlow(buildFlow(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setResult(null);
    setFlow(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  const stepsCount = result?.plan?.steps?.length ?? 0;
  const outputsCount = result?.outputs?.length ?? 0;
  const results: ExecutionResult[] = Array.isArray(result?.results)
    ? result.results
    : [];
  const errorCount = results.filter((item) => !item.ok).length;

  return (
    <div className="page">
      <div className="hero">
        <div className="title">AI Planner Studio</div>
        <div className="subtitle">
          Turn natural language into structured plans, then run them with
          auditable execution logs.
        </div>
      </div>

      <div className="grid">
        <div className="panel delay-1">
          <div className="panel-title">Task Input</div>
          <input
            type="text"
            ref={inputRef}
            className="input"
            placeholder="Describe the task you want to execute"
            disabled={loading}
          />
          <div className="actions">
            <button
              className="button button-primary"
              onClick={handleRun}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Run Task'}
            </button>
            <button className="button button-ghost" onClick={handleClear}>
              Clear
            </button>
          </div>
          <div className="status">
            {loading
              ? 'Planner and executor are working...'
              : 'Ready to build a plan.'}
          </div>
          {error && <div className="status">Error: {error}</div>}
          <div className="badges">
            <div className="badge">Steps: {stepsCount}</div>
            <div className="badge">Outputs: {outputsCount}</div>
            <div className="badge badge-ok">Success: {results.length - errorCount}</div>
            <div className="badge badge-fail">Errors: {errorCount}</div>
          </div>
        </div>

        <div className="panel delay-2">
          <div className="panel-title">Execution Flow</div>
          <div className="flow-wrap">
            {flow ? (
              <ReactFlow nodes={flow.nodes} edges={flow.edges} fitView />
            ) : (
              <div className="flow-empty">
                Run a task to visualize the planner and executor flow.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="panel delay-1">
          <div className="panel-title">Plan JSON</div>
          {result?.plan ? (
            <pre className="pre">{JSON.stringify(result.plan, null, 2)}</pre>
          ) : (
            <div className="empty">No plan yet.</div>
          )}
        </div>

        <div className="panel delay-2">
          <div className="panel-title">Execution Results</div>
          {results.length ? (
            <div className="list">
              {results.map((item, index) => (
                <div
                  key={`${item.stepIndex}-${index}`}
                  className={`list-item ${item.ok ? 'ok' : 'fail'}`}
                >
                  <span>
                    Step {item.stepIndex + 1} {item.type ? `(${item.type})` : ''}
                  </span>
                  <span>{item.ok ? 'ok' : item.error ?? 'failed'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No execution results yet.</div>
          )}
        </div>

        <div className="panel delay-3">
          <div className="panel-title">Outputs</div>
          {outputsCount ? (
            <div className="list">
              {result.outputs.map((item: any, index: number) => (
                <div key={`out-${index}`} className="list-item">
                  <span>{item.type}</span>
                  <span>{JSON.stringify(item.payload)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No outputs yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
