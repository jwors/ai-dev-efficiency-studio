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

const QUICK_EXAMPLES = [
  { label: '用户注册', text: '用户注册流程：填写邮箱 → 发送验证码 → 验证邮箱 → 设置密码 → 注册成功' },
  { label: '订单处理', text: '电商订单处理流程：下单 → 支付 → 库存检查 → 发货 → 物流跟踪 → 确认收货' },
  { label: '审批流程', text: '企业请假审批流程：提交申请 → 主管审批 → 人事审核 → 结果通知' },
];

export default function TaskFlowPluginPage() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TaskFlowApiResponse | null>(null);
  const { userId } = useAuthUserId();
  const sessionId = userId ? `${userId}:tf` : '';

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
      setError('请输入任务描述');
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
      setError(err instanceof Error ? err.message : '请求失败');
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
        <section className="panel flow-panel" style={{ animationDelay: '0ms' }}>
          <div className="panel-title">
            <span>任务流程图</span>
            {result?.tf && (
              <span style={{ fontSize: '11px', opacity: 0.6 }}>
                {result.tf.nodes?.length || 0} 个节点
              </span>
            )}
          </div>
          <div className="flow-wrap">
            <TaskFlow tf={result?.tf ?? null} />
          </div>
        </section>
      </div>

      <section className="panel input-panel" style={{ animationDelay: '50ms' }}>
        <div className="panel-title">
          <span>任务输入</span>
          {loading && <span style={{ fontSize: '11px', opacity: 0.7 }}>生成中...</span>}
        </div>
        <textarea
          ref={inputRef}
          className="input"
          placeholder="描述您想要执行的任务（Shift+Enter 换行）..."
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
            {loading ? '生成中...' : '生成流程图'}
          </button>
        </div>
        <div className="status">
          {loading ? 'AI 正在构建任务流程...' : '准备好生成任务流程图'}
        </div>
        {error && <div className="status errmsg">{error}</div>}
        {tf && !tf.ok && (
          <div className="status errmsg">
            流程图插件执行失败: {tf.error ?? '未知错误'}
          </div>
        )}
      </section>
    </main>
  );
}
