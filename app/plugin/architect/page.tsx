'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './architect.module.css'
import { useAuthUserId } from '@/lib/hooks/useAuthUserId';
import { ArchitectureFlow } from '@/app/components/ArchitectureFlow';
import { TemplateSelector } from '@/app/components/TemplateSelector';
import WbsFlow from '@/app/components/Wbs';
import { TaskFlow } from '@/app/components/taskFlow';
import type { ArchitectureJson } from '@/core/types';
import { architectureToTaskFlowView, architectureToWbsView } from '@/lib/architecture/adapters';
import { createFromTemplate, type ArchitectureTemplate } from '@/lib/architecture/templates';

type PluginResult = {
  name: string;
  ok: boolean;
  error?: string;
};

type ArchitectApiResponse = {
  architecture: ArchitectureJson | null;
  plugins?: PluginResult[];
  sessionId?: string;
};

type ArchitectView = 'architecture' | 'wbs' | 'taskflow';

type ProjectionCard = {
  title: string;
  primary: string;
  secondary: string;
};

const QUICK_EXAMPLES = [
  { label: '后台管理系统', text: '搭建一个后台管理系统，需要用户管理、权限控制、数据统计功能' },
  { label: '电商平台', text: '设计一个电商平台，包含用户、商品、订单、支付模块，需要高并发支持' },
  { label: '博客系统', text: '开发一个博客系统，支持文章发布、评论、搜索功能' },
  { label: '微服务 SaaS', text: '设计一个微服务架构的 SaaS 平台，包含租户管理、计费、通知服务' },
];

const VIEW_OPTIONS: Array<{ key: ArchitectView; label: string }> = [
  { key: 'architecture', label: '架构图' },
  { key: 'wbs', label: 'WBS 视图' },
  { key: 'taskflow', label: '流程视图' },
];

export default function ArchitectPluginPage() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArchitectApiResponse | null>(null);
  const [activeView, setActiveView] = useState<ArchitectView>('architecture');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const { userId } = useAuthUserId();
  const sessionId = userId ? `${userId}:architect` : '';

  // ========== 数据持久化 ==========

  // 页面加载时恢复上次的架构数据
  useEffect(() => {
    if (!userId) return;

    void loadSessionData().catch((err) => {
      console.error('[Architect] 加载会话失败:', err);
    });
  }, [userId]);

  // 页面隐藏/关闭时保存架构数据
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

  // 从服务器加载上次保存的架构数据
  async function loadSessionData() {
    if (!userId) return;

    const params = new URLSearchParams({
      userId,
      scope: 'architect'
    });

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

    if (!res.ok || !data) return;

    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    const lastSession = sessions[0];

    if (lastSession?.architecture) {
      setResult({
        architecture: lastSession.architecture,
        sessionId,
      });
    }
  }

  const architecture = result?.architecture ?? null;

  const wbsView = useMemo(() => {
    if (!architecture) return null;
    return architectureToWbsView(architecture);
  }, [architecture]);

  const taskFlowView = useMemo(() => {
    if (!architecture) return null;
    return architectureToTaskFlowView(architecture);
  }, [architecture]);

  const projectionCards = useMemo<ProjectionCard[]>(() => {
    if (!architecture || !wbsView || !taskFlowView) return [];

    const rootCount = wbsView.nodes.filter((node) => !node.parentId).length;
    const blockedCount = taskFlowView.nodes.filter((node) => node.status === 'blocked').length;

    return [
      {
        title: '架构源模型',
        primary: `${architecture.components.length} 组件 / ${architecture.connections.length} 连线`,
        secondary: `${architecture.layers.length} 层级 · ${architecture.style ?? '未指定风格'}`,
      },
      {
        title: 'WBS 投影',
        primary: `${wbsView.nodes.length} 节点 / ${wbsView.edges.length} 关系`,
        secondary: `${rootCount} 个根节点 · 适配任务拆解视图`,
      },
      {
        title: '流程投影',
        primary: `${taskFlowView.nodes.length} 节点 / ${taskFlowView.edges.length} 连线`,
        secondary: `${blockedCount} 个风险节点 · 适配流程视图`,
      },
    ];
  }, [architecture, taskFlowView, wbsView]);

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

  async function handleRun() {
    const input = inputRef.current?.value;
    if (!input) {
      setError('请输入需求描述');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveView('architecture');
    try {
      const response = await fetch('/api/architect', {
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
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  const architectPlugin = (result?.plugins as PluginResult[] | undefined)?.find(
    (p) => p.name === 'architect',
  );

  const hasTechStack = Boolean(architecture?.techStack?.length);
  const hasDecisions = Boolean(architecture?.decisions?.length);
  const showInfoPanel = Boolean(architecture) || hasTechStack || hasDecisions;

  const flowSummary = useMemo(() => {
    if (!architecture) return null;
    if (activeView === 'wbs') {
      return `${wbsView?.nodes.length || 0} 个节点 · ${wbsView?.edges.length || 0} 条关系`;
    }
    if (activeView === 'taskflow') {
      return `${taskFlowView?.nodes.length || 0} 个流程节点 · ${taskFlowView?.edges.length || 0} 条连线`;
    }
    return `${architecture.components.length} 个组件 · ${architecture.techStack?.length ?? 0} 项技术栈`;
  }, [activeView, architecture, taskFlowView, wbsView]);

  // 处理架构编辑更新
  function handleArchitectureChange(updatedArchitecture: ArchitectureJson) {
    if (!result) return;
    // 更新本地状态
    setResult({
      ...result,
      architecture: updatedArchitecture,
    });
    // 异步保存到后端
    void saveArchitecture(updatedArchitecture);
  }

  // 保存架构数据到后端
  async function saveArchitecture(architecture: ArchitectureJson) {
    if (!sessionId) return;

    try {
      await fetch('/api/architect/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, architecture }),
      });
    } catch (err) {
      console.error('[Architect] 保存架构失败:', err);
    }
  }

  // 处理模板选择
  function handleTemplateSelect(template: ArchitectureTemplate) {
    const architecture = createFromTemplate(template.id);
    if (architecture) {
      setResult({
        architecture,
        sessionId,
      });
      setShowTemplateSelector(false);
      // 保存到后端
      void saveArchitecture(architecture);
    }
  }

  function renderActiveView() {
    if (activeView === 'wbs') {
      return <WbsFlow wbs={wbsView} />;
    }

    if (activeView === 'taskflow') {
      return <TaskFlow tf={taskFlowView} />;
    }

    return (
      <div className="flow-wrap">
        <ArchitectureFlow
          architecture={architecture}
          editable={true}
          onChange={handleArchitectureChange}
        />
      </div>
    );
  }

  return (
    <main className={`main ${styles.architectRoot}`}>
      <div className="main-top">
        <section className="panel flow-panel" style={{ animationDelay: '0ms' }}>
          <div className={styles.flowHeader}>
            <div className="panel-title">
              <span>系统设计视图</span>
              {flowSummary && (
                <span style={{ fontSize: '11px',color:'black',marginLeft:'3px', opacity: 0.6 }}>
                  {flowSummary}
                </span>
              )}
            </div>
            <div className={styles.viewTabs}>
              {VIEW_OPTIONS.map((view) => (
                <button
                  key={view.key}
                  type="button"
                  className={view.key === activeView ? styles.viewTabActive : styles.viewTab}
                  onClick={() => setActiveView(view.key)}
                  disabled={!architecture}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
          {renderActiveView()}
        </section>
      </div>

      <div className={styles.bottomSection}>
        <section className="panel input-panel" style={{ animationDelay: '50ms' }}>
          <div className="panel-title">
            <span>需求描述</span>
            {loading && <span style={{ fontSize: '11px', opacity: 0.7 }}>生成中...</span>}
          </div>
          <textarea
            ref={inputRef}
            className="input"
            placeholder="描述您想要构建的系统（Shift+Enter 换行）..."
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
              className="button button-secondary"
              onClick={() => setShowTemplateSelector(true)}
              disabled={loading}
            >
              模板库
            </button>
            <button
              className="button button-primary"
              onClick={handleRun}
              disabled={loading}
            >
              {loading ? '生成中...' : '生成架构图'}
            </button>
          </div>
          <div className="status">
            {loading ? 'AI 正在设计系统架构...' : '输入需求描述，AI 将为您生成系统架构设计'}
          </div>
          {error && <div className="status errmsg">{error}</div>}
          {architectPlugin && !architectPlugin.ok && (
            <div className="status errmsg">
              架构图插件执行失败: {architectPlugin.error ?? '未知错误'}
            </div>
          )}
        </section>

        {showInfoPanel && (
          <section className={`panel ${styles.infoPanel}`} style={{ animationDelay: '100ms' }}>
            <div className="panel-title">
              <span>架构详情</span>
            </div>
            <div className={styles.infoScroll}>
              {projectionCards.length > 0 && (
                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>Phase 1 验证摘要</div>
                  <div className={styles.projectionGrid}>
                    {projectionCards.map((card) => (
                      <div key={card.title} className={styles.projectionCard}>
                        <div className={styles.projectionTitle}>{card.title}</div>
                        <div className={styles.projectionPrimary}>{card.primary}</div>
                        <div className={styles.projectionSecondary}>{card.secondary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasTechStack && (
                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>技术栈</div>
                  <div className={styles.techStack}>
                    {architecture!.techStack.map((tech, index) => (
                      <div key={index} className={styles.techItem}>
                        <div className={styles.techCategory}>{tech.category}</div>
                        <div className={styles.techName}>
                          {tech.name}
                          {tech.version && <span className={styles.techVersion}>v{tech.version}</span>}
                        </div>
                        {tech.reason && <div className={styles.techReason}>{tech.reason}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasDecisions && (
                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>架构决策</div>
                  <div className={styles.decisions}>
                    {architecture!.decisions!.map((decision, index) => (
                      <div key={index} className={styles.decisionItem}>
                        <div className={styles.decisionTopic}>{decision.topic}</div>
                        <div className={styles.decisionChoice}>
                          <span className={styles.decisionLabel}>选择：</span>
                          {decision.choice}
                        </div>
                        <div className={styles.decisionReason}>
                          <span className={styles.decisionLabel}>理由：</span>
                          {decision.reason}
                        </div>
                        {decision.alternatives && decision.alternatives.length > 0 && (
                          <div className={styles.decisionAlternatives}>
                            <span className={styles.decisionLabel}>备选：</span>
                            {decision.alternatives.join('、')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* 模板选择器 */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </main>
  );
}
