'use client';

import { getOrCreateSessionId } from '@/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type ExecutionResult = {
  stepIndex: number;
  type?: string;
  ok: boolean;
  data?: unknown;
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
  const [uuid,setUuid] = useState<string | null>(null)
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  useEffect(()=>{
    
    const id = getOrCreateSessionId()
    setUuid(id)
  },[])

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
  const emitContents = Array.isArray(result?.plan?.steps)
    ? result.plan.steps
        .filter((step: any) => step.action === 'emit')
        .map((step: any) => step?.params?.data?.content)
        .filter((content: unknown) => typeof content === 'string')
    : [];
  const outlineData = useMemo<OutlineData[]>(
    () =>
      emitContents.map((content, emitIndex) => {
        const roots: OutlineNode[] = [];
        const stack: OutlineNode[] = [];
        const headingIds: string[] = [];
        const listIds: string[] = [];
        let headingCounter = 0;
        let listCounter = 0;
        let currentHeadingLevel = 0;

        content.split('\n').forEach((line) => {
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
    [emitContents],
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

  const executorFlowText = useMemo(() => {
    if (!result) {
      return '';
    }
    return JSON.stringify(
      {
        plan: result.plan ?? null,
        results: result.results ?? [],
        outputs: result.outputs ?? [],
      },
      null,
      2,
    );
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
    <div className="page">
      <div className="layout">
        <aside className="nav">
          <div className="nav-title">导航栏</div>
          <button className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-6 1.6-6 3.6V20h12v-2.4c0-2-2.7-3.6-6-3.6z"
                fill="currentColor"
              />
            </svg>
            <span>个人信息</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M14 2H10l-.4 2.1-1.8.7-1.7-1.2-2.8 2.8 1.2 1.7-.7 1.8L2 10v4l2.1.4.7 1.8-1.2 1.7 2.8 2.8 1.7-1.2 1.8.7L10 22h4l.4-2.1 1.8-.7 1.7 1.2 2.8-2.8-1.2-1.7.7-1.8L22 14v-4l-2.1-.4-.7-1.8 1.2-1.7-2.8-2.8-1.7 1.2-1.8-.7L14 2zm-2 6a4 4 0 1 1-4 4 4 4 0 0 1 4-4z"
                fill="currentColor"
              />
            </svg>
            <span>插件</span>
          </button>
          <button className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4.5 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
                fill="currentColor"
              />
            </svg>
            <span>聊天</span>
          </button>
        </aside>

        <main className="main">
          <div className="main-top">
            <section className="panel content-panel">
              <div className="panel-title">内容</div>
              {emitContents.length ? (
                <div className="emit-list">
                  {emitContents.map((content: string, index: number) => {
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
                          {content}
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
            {error && <div className="status">Error: {error}</div>}
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
      </div>
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
              {executorFlowText ? (
                <pre className="modal-pre">{executorFlowText}</pre>
              ) : (
                <div className="empty">No executor flow yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
