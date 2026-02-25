'use client';

import { mergePlanAndResults } from '@/lib/merge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthUserId } from '@/lib/hooks/useAuthUserId';
import ReactMarkdown from 'react-markdown';

type ExecutionResult = {
  stepIndex: number;
  type?: string;
  ok: boolean;
  payload?: unknown;
  error?: string;
};

type OutlineNode = {
  id: string;
  text: string;
  level: number;
  children: OutlineNode[];
  targetId?: string;
};

type OutlineData = {
  roots: OutlineNode[];
  headingIds: string[];
  listIds: string[];
};

type MarkdownHeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown;
};

type MarkdownListItemProps = React.LiHTMLAttributes<HTMLLIElement> & {
  node?: unknown;
};

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const { userId } = useAuthUserId();
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [selectedStepIndex,setSelectedStepIndex] = useState<null|number>(null)
  const sessionId = userId ? `${userId}:planExecutor` : '';
  
  useEffect(() => {
    if (!userId) return;

    void getSessionList().catch((err) => {
      console.error('getSessionList failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load last session');
    });
  }, [userId])
  
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


  useEffect(() => {
    if (!isFlowOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFlowOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlowOpen]);

  async function handleRun(value:any = null) {
    const input = inputRef.current?.value || value;
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

  // 查询上次对话记录
  async function getSessionList() {
    if (!userId) return
    const params = new URLSearchParams({
      userId,
      scope:'planExecutor'
    })
    const res = await fetch(`/api/session?${params.toString()}`, {
      method:'GET'
    })
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data) {
      try {
        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        const history: any[] = Array.isArray(sessions[0]?.history) ? sessions[0].history : [];
        const value = history
          .filter((item: any) => item?.role === 'user' && typeof item?.content === 'string')
          .at(-1);
        if (value?.content) {
          handleRun(value.content)
        }
      } catch(err) {
        throw(err)
      }
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
  const emitContents = Array.isArray(result?.outputs)
    ? result.outputs
        .map((item: any) => {
          if (item?.type === 'emit' && item?.payload?.content) {
            return { content: item.payload.content as string, type: 'emit' };
          }
          if (item?.output?.type === 'emit' && item?.output?.payload?.content) {
            return {
              content: item.output.payload.content as string,
              type: 'emit',
            };
          }
          return null;
        })
        .filter(
          (item: { content: string; type: string } | null) =>
            item && typeof item.content === 'string',
        )
    : [];
  const outlineEmitContents = Array.isArray(result?.results)
    ? result.results
        .map((item: any) => {
          if (item?.type === 'emit' && item?.payload?.content) {
            return { content: item.payload.content as string, type: 'emit' };
          }
          if (item?.output?.type === 'emit' && item?.output?.payload?.content) {
            return {
              content: item.output.payload.content as string,
              type: 'emit',
            };
          }
          return null;
        })
        .filter(
          (item: { content: string; type: string } | null) =>
            item && typeof item.content === 'string',
        )
    : [];
  const outlineData = useMemo<OutlineData[]>(
    () =>
      outlineEmitContents.map((item: any, emitIndex: any) => {
        const roots: OutlineNode[] = [];
        const stack: OutlineNode[] = [];
        const headingIds: string[] = [];
        const listIds: string[] = [];
        let headingCounter = 0;
        let listCounter = 0;
        let currentHeadingLevel = 0;

        item.content.split('\n').forEach((line:any) => {
          const trimmed = line.trim();
          const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2].trim();
            const headingIndex = headingCounter++;
            const targetId = `emit-${emitIndex}-h-${headingIndex}`;
            headingIds.push(targetId);
            const node: OutlineNode = {
              id: `outline-${emitIndex}-h-${headingIndex}`,
              text,
              level,
              children: [],
              targetId,
            };

            while (stack.length && level <= stack[stack.length - 1].level) {
              stack.pop();
            }

            if (stack.length) {
              stack[stack.length - 1].children.push(node);
            } else {
              roots.push(node);
            }

            stack.push(node);
            currentHeadingLevel = level;
            return;
          }

          const listMatch = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
          if (listMatch) {
            const indentLevel = Math.floor(listMatch[1].length / 2);
            const text = listMatch[3].trim();
            if (!text) {
              return;
            }
            const level = Math.max(1, currentHeadingLevel + 1 + indentLevel);
            const listIndex = listCounter++;
            const targetId = `emit-${emitIndex}-li-${listIndex}`;
            listIds.push(targetId);
            const node: OutlineNode = {
              id: `outline-${emitIndex}-li-${listIndex}`,
              text,
              level,
              children: [],
              targetId,
            };

            while (stack.length && level <= stack[stack.length - 1].level) {
              stack.pop();
            }

            if (stack.length) {
              stack[stack.length - 1].children.push(node);
            } else {
              roots.push(node);
            }

            stack.push(node);
          }
        });

        return { roots, headingIds, listIds };
      }),
    [outlineEmitContents],
  );

  const outlineTree = useMemo(() => {
    const roots: OutlineNode[] = [];
    outlineData.forEach((data, index) => {
      if (!data.roots.length) {
        return;
      }
      roots.push({
        id: `outline-emit-${index}`,
        text: `Emit ${index + 1}`,
        level: 1,
        children: data.roots,
      });
    });
    return roots;
  }, [outlineData]);

  const stepViews = useMemo(() => {
    if (!result) {
      return [];
    }
    if (!result?.plan) return [];
    return mergePlanAndResults(result.plan, result.results ?? []);
  }, [result]);


  const handleOutlineClick = (targetId?: string) => {
    if (!targetId) {
      return;
    }
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderOutline = (nodes: OutlineNode[]) => (
    <ul className="outline-list">
      {nodes.map((node) => (
        <li key={node.id} className="outline-item">
          <button
            type="button"
            className="outline-text"
            onClick={() => handleOutlineClick(node.targetId)}
            disabled={!node.targetId}
          >
            {node.text}
          </button>
          {node.children.length ? renderOutline(node.children) : null}
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <main className="main">
        <div className="main-top">
          <section className="panel content-panel">
            <div className="panel-title">内容</div>
            {emitContents.length ? (
              <div className="emit-list">
                {emitContents.map((item: any, index: number) => {
                  const headingIds = outlineData[index]?.headingIds ?? [];
                  const listIds = outlineData[index]?.listIds ?? [];
                  let headingCursor = 0;
                  let listCursor = 0;
                  const components = {
                    h1: (props: MarkdownHeadingProps) => {
                      const { node, ...rest } = props;
                      const id = headingIds[headingCursor++];
                      return <h1 id={id} {...rest} />;
                    },
                    h2: (props: MarkdownHeadingProps) => {
                      const { node, ...rest } = props;
                      const id = headingIds[headingCursor++];
                      return <h2 id={id} {...rest} />;
                    },
                    h3: (props: MarkdownHeadingProps) => {
                      const { node, ...rest } = props;
                      const id = headingIds[headingCursor++];
                      return <h3 id={id} {...rest} />;
                    },
                    h4: (props: MarkdownHeadingProps) => {
                      const { node, ...rest } = props;
                      const id = headingIds[headingCursor++];
                      return <h4 id={id} {...rest} />;
                    },
                    h5: (props: MarkdownHeadingProps) => {
                      const { node, ...rest } = props;
                      const id = headingIds[headingCursor++];
                      return <h5 id={id} {...rest} />;
                    },
                    h6: (props: MarkdownHeadingProps) => {
                      const { node, ...rest } = props;
                      const id = headingIds[headingCursor++];
                      return <h6 id={id} {...rest} />;
                    },
                    li: (props: MarkdownListItemProps) => {
                      const { node, ...rest } = props;
                      const id = listIds[listCursor++];
                      return <li id={id} {...rest} />;
                    },
                  };

                  return (
                    <div key={`emit-${index}`} className="emit-card">
                      <div className="emit-body markdown">
                        <ReactMarkdown components={components}>
                          {item.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty">No emit content yet.</div>
            )}
          </section>

          <section className="panel flow-panel">
            <div className="panel-title">内容地图</div>
            <div className="flow-wrap">
              {outlineTree.length ? (
                <div className="outline-tree">{renderOutline(outlineTree)}</div>
              ) : (
                <div className="flow-empty">No outline yet.</div>
              )}
            </div>
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
            <button
              className="button button-ghost"
              onClick={() => setIsFlowOpen(true)}
              disabled={!result}
            >
              View Executor Flow
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
          {error && <div className="status errmsg">Error: {error}</div>}
          <div className="badges">
            <div className="badge">Steps: {stepsCount}</div>
            <div className="badge">Outputs: {outputsCount}</div>
            <div className="badge badge-ok">
              Success: {results.length - errorCount}
            </div>
            <div className="badge badge-fail">Errors: {errorCount}</div>
          </div>
        </section>
      </main>
      {isFlowOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setIsFlowOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="executor-flow-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" id="executor-flow-title">
                Executor Flow
              </h2>
              <button
                className="button button-ghost modal-close"
                type="button"
                onClick={() => setIsFlowOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body">
  {stepViews.length ? (
    <div className="flow-modal-grid">
      {/* 左侧：步骤列表 */}
      <div className="flow-steps">
        {stepViews.map((s: any) => {
          const isActive = s.stepIndex === selectedStepIndex;
          const statusClass =
            s.status === "ok"
              ? "step-ok"
              : s.status === "failed"
              ? "step-failed"
              : "step-skipped";

          return (
            <button
              key={s.stepIndex}
              type="button"
              className={`flow-step ${statusClass} ${isActive ? "active" : ""}`}
              onClick={() => setSelectedStepIndex(s.stepIndex)}
            >
              <div className="flow-step-title">
                <span className="flow-step-idx">#{s.stepIndex + 1}</span>
                <span className="flow-step-action">{s.action}</span>
              </div>
              <div className="flow-step-sub">
                <span className="flow-step-status">{s.status}</span>
                {s.fatal ? <span className="flow-step-fatal">fatal</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* 右侧：详情面板 */}
      <div className="flow-detail">
        {(() => {
          const s = stepViews.find((x: any) => x.stepIndex === selectedStepIndex) ?? stepViews[0];

          return (
            <>
              <div className="flow-detail-header">
                <div className="flow-detail-title">
                  Step {s.stepIndex + 1}: {s.action}
                </div>
                <div className={`flow-chip ${
                  s.status === "ok" ? "chip-ok" : s.status === "failed" ? "chip-failed" : "chip-skipped"
                }`}>
                  {s.status}
                </div>
              </div>

              {s.error ? (
                <div className="flow-detail-error">
                  <strong>Error:</strong> {s.error}
                </div>
              ) : null}

              {s.outputContent ? (
                <div className="flow-detail-output">
                  <div className="flow-detail-section-title">Output</div>
                  <div className="markdown">
                    <ReactMarkdown>{s.outputContent}</ReactMarkdown>
                  </div>
                </div>
              ) : null}

              {s.emitContent ? (
                <div className="flow-detail-output">
                  <div className="flow-detail-section-title">Emit</div>
                  <div className="markdown">
                    <ReactMarkdown>{s.emitContent}</ReactMarkdown>
                  </div>
                </div>
              ) : null}

              <div className="flow-detail-section">
                <div className="flow-detail-section-title">Params</div>
                <pre className="flow-detail-pre">
                  {JSON.stringify(s.params ?? {}, null, 2)}
                </pre>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  ) : (
    <div className="empty">No executor flow yet.</div>
  )}
</div>

          </div>
        </div>
      )}
    </>
  );
}
