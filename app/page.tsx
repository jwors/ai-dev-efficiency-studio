'use client';

import { getOrCreateSessionId } from '@/utils';
import { useEffect, useRef, useState } from 'react';
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
  const [uuid,setUuid] = useState<string | null>(null)
  useEffect(()=>{
    
    const id = getOrCreateSessionId()
    setUuid(id)
  },[])

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
      const emitContent =
        step.action === 'emit' ? step?.params?.data?.content : undefined;
      const stepLabel =
        step.action === 'emit' && typeof emitContent === 'string'
          ? `${index + 1}. emit: ${emitContent}`
          : `${index + 1}. ${step.action}`;

      nodes.push({
        id: stepId,
        data: { label: stepLabel },
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
        body: JSON.stringify({ input,uuid }),
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

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleRun();
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
  const hasExportFlow =
    Array.isArray(result?.plan?.steps) &&
    result.plan.steps.some((step: any) => step.action === 'export_flow');
  const emitContents = Array.isArray(result?.plan?.steps)
    ? result.plan.steps
        .filter((step: any) => step.action === 'emit')
        .map((step: any) => step?.params?.data?.content)
        .filter((content: unknown) => typeof content === 'string')
    : [];
  const renderFlowBody = () =>
    flow ? (
      <ReactFlow nodes={flow.nodes} edges={flow.edges} fitView />
    ) : (
      <div className="flow-empty">
        Run a task to visualize the planner and executor flow.
      </div>
    );

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
          <div className="panel-title">Content Container</div>
          {emitContents.length ? (
            <div className="list emit-list">
              {emitContents.map((content: string, index: number) => (
                <div key={`emit-${index}`} className="list-item emit-item">
                  <span>{content}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No emit content yet.</div>
          )}
        </div>
      </div>

      {hasExportFlow && (
        <div className="grid">
          <div className="panel delay-1">
            <div className="panel-title">Flow</div>
            <div className="flow-wrap">{renderFlowBody()}</div>
          </div>

          <div className="panel delay-2">
            <div className="panel-title">Flow</div>
            <div className="flow-wrap">{renderFlowBody()}</div>
          </div>

          <div className="panel delay-3">
            <div className="panel-title">Flow</div>
            <div className="flow-wrap">{renderFlowBody()}</div>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="panel delay-2">
          <div className="panel-title">Execution Flow</div>
          <div className="flow-wrap">{renderFlowBody()}</div>
        </div>
      </div>
    </div>
  );
}
