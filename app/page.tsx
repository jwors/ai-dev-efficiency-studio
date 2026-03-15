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

const QUICK_EXAMPLES = [
  { label: '项目规划', text: '帮我规划一个电商网站的开发计划，包括前端、后端和数据库设计' },
  { label: '竞品分析', text: '生成一份在线教育平台的竞品分析报告大纲' },
  { label: '流程设计', text: '设计一个用户注册登录的完整流程，包括密码找回和第三方登录' },
  { label: '技术选型', text: '对比 Next.js 和 Nuxt.js 的优缺点，给出选择建议' },
];

export default function Page() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const { userId } = useAuthUserId();
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<null | number>(null);
  const sessionId = userId ? `${userId}:planExecutor` : '';

  useEffect(() => {
    if (!userId) return;

    void getSessionList().catch((err) => {
      setError(err instanceof Error ? err.message : '加载上次会话失败');
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

  async function handleRun(value: any = null) {
    const input = inputRef.current?.value || value;
    if (!input) {
      setError('请输入任务描述');
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
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  // 查询上次对话记录
  async function getSessionList() {
    if (!userId) return
    const params = new URLSearchParams({
      userId,
      scope: 'planExecutor'
    })
    const res = await fetch(`/api/session?${params.toString()}`, {
      method: 'GET',
    });
    const text = await res.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const message =
        data?.error || text || res.statusText || `HTTP ${res.status}`;
      throw new Error(message);
    }
    if (data) {
      try {
        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        const history: any[] = Array.isArray(sessions[0]?.history) ? sessions[0].history : [];
        const last = sessions[0]
        if (last?.plan || last?.results || last?.outputs) {
          setResult({
            plan: last.plan ?? null,
            results: last.results ?? [],
            outputs: last.outputs ?? [],
          });
          return;
        }
        const value = history
          .filter((item: any) => item?.role === 'user' && typeof item?.content === 'string')
          .at(-1);
        if (value?.content) {
          handleRun(value.content);
        }
      } catch (err) {
        throw (err)
      }
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
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

  function handleExampleClick(text: string) {
    if (inputRef.current) {
      inputRef.current.value = text;
      inputRef.current.focus();
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

        item.content.split('\n').forEach((line: any) => {
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
        text: `输出 ${index + 1}`,
        level: 1,
        children: data.roots,
      });
    });
    return roots;
  }, [outlineData]);

  const outlineMetrics = useMemo(() => {
    let totalNodes = 0;
    let maxDepth = 0;

    const walk = (nodes: OutlineNode[], depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      nodes.forEach((node) => {
        totalNodes += 1;
        if (node.children.length) {
          walk(node.children, depth + 1);
        }
      });
    };

    walk(outlineTree, 1);

    const headingCount = outlineData.reduce((sum, data) => sum + data.headingIds.length, 0);
    const listCount = outlineData.reduce((sum, data) => sum + data.listIds.length, 0);

    return { totalNodes, maxDepth, headingCount, listCount };
  }, [outlineData, outlineTree]);

  const shouldShowOutline = useMemo(() => {
    if (!outlineTree.length) {
      return false;
    }

    if (outlineMetrics.headingCount >= 3) {
      return true;
    }

    if (outlineMetrics.listCount >= 4) {
      return true;
    }

    return outlineMetrics.maxDepth >= 3 || outlineMetrics.totalNodes >= 6;
  }, [outlineMetrics, outlineTree]);

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

  const artifacts = Array.isArray(result?.outputs)
    ? result.outputs.filter((o: any) => o?.type === 'artifact' && o?.payload?.url)
    : [];
  return (
    <>
      <main className="main">
        <div
          className={`main-top ${shouldShowOutline ? 'has-outline' : ''}`}
        >
          <section className="panel content-panel" style={{ animationDelay: '0ms' }}>
            <div className="panel-title">
              <span>内容输出</span>
              {emitContents.length > 0 ? (
                <span style={{ fontSize: '11px', opacity: 0.6 }}>{emitContents.length} 个输出</span>
              ) : null}
            </div>
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
                      <div className="emit-header">
                        <span className="emit-index">输出 #{index + 1}</span>
                      </div>
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
              <div className="flow-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>暂无内容输出</span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>输入任务描述开始生成内容</span>
              </div>
            )}
          </section>
          {shouldShowOutline ? (
            <section className="panel flow-panel" style={{ animationDelay: '50ms' }}>
              <div className="panel-title">
                <span>内容地图</span>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>{outlineTree.length} 个章节</span>
              </div>
              <div className="flow-wrap">
                <div className="outline-tree">{renderOutline(outlineTree)}</div>
              </div>
            </section>
          ) : null}
        </div>

        <section className="panel input-panel" style={{ animationDelay: '100ms' }}>
          <div className="panel-title">
            <span>任务输入</span>
            {loading && <span style={{ fontSize: '11px', opacity: 0.7 }}>处理中...</span>}
          </div>
          <textarea
            ref={inputRef}
            className="input"
            placeholder="描述您想要执行的任务...（Shift+Enter 换行）"
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
              {loading ? '执行中...' : '运行任务'}
            </button>
            <button
              className="button button-ghost"
              onClick={() => setIsFlowOpen(true)}
              disabled={!result}
            >
              查看执行流程
            </button>
            <button className="button button-ghost" onClick={handleClear}>
              清空
            </button>
            {artifacts.length ? (
              <div className="emit-card" style={{ padding: '12px 16px', marginBottom: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--accent)' }}>
                  下载文件 ({artifacts.length})
                </div>
                {artifacts.map((a: any, i: number) => (
                  <div key={`artifact-${i}`} style={{ marginBottom: i < artifacts.length - 1 ? '6px' : 0 }}>
                    <a href={a.payload.url} download style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                      {a.payload.filename ?? a.payload.url}
                    </a>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="status">
            {loading
              ? 'AI 正在规划和执行您的任务...'
              : '准备好构建执行计划'}
          </div>
          {error && <div className="status errmsg">{error}</div>}
          {result && (
            <div className="badges">
              <div className="badge">步骤: {stepsCount}</div>
              <div className="badge">输出: {outputsCount}</div>
              <div className="badge badge-ok">成功: {results.length - errorCount}</div>
              {errorCount > 0 && <div className="badge badge-fail">错误: {errorCount}</div>}
            </div>
          )}
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
                执行流程详情
              </h2>
              <button
                className="button button-ghost modal-close"
                type="button"
                onClick={() => setIsFlowOpen(false)}
              >
                关闭
              </button>
            </div>
            <div className="modal-body">
              {stepViews.length ? (
                <div className="flow-modal-grid">
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
                            {s.fatal ? <span className="flow-step-fatal">致命</span> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flow-detail">
                    {(() => {
                      const s = stepViews.find((x: any) => x.stepIndex === selectedStepIndex) ?? stepViews[0];

                      return (
                        <>
                          <div className="flow-detail-header">
                            <div className="flow-detail-title">
                              步骤 {s.stepIndex + 1}: {s.action}
                            </div>
                            <div className={`flow-chip ${s.status === "ok" ? "chip-ok" : s.status === "failed" ? "chip-failed" : "chip-skipped"
                              }`}>
                              {s.status}
                            </div>
                          </div>

                          {s.error ? (
                            <div className="flow-detail-error">
                              <strong>错误:</strong> {s.error}
                            </div>
                          ) : null}

                          {s.outputContent ? (
                            <div className="flow-detail-output">
                              <div className="flow-detail-section-title">输出</div>
                              <div className="markdown">
                                <ReactMarkdown>{s.outputContent}</ReactMarkdown>
                              </div>
                            </div>
                          ) : null}

                          {s.emitContent ? (
                            <div className="flow-detail-output">
                              <div className="flow-detail-section-title">发送内容</div>
                              <div className="markdown">
                                <ReactMarkdown>{s.emitContent}</ReactMarkdown>
                              </div>
                            </div>
                          ) : null}

                          <div className="flow-detail-section">
                            <div className="flow-detail-section-title">参数</div>
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
                <div className="flow-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>暂无执行流程</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}







