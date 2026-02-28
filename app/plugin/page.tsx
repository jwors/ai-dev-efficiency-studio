'use client';

import Link from 'next/link';

const plugins = [
  {
    slug: 'wbs',
    name: 'WBS 任务拆解图',
    description: '根据多轮对话生成任务结构与依赖关系，直观展示项目层次。',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h4m-4 6h8m-8 6h12" />
        <rect x="14" y="5" width="6" height="5" rx="1" />
        <rect x="12" y="11" width="6" height="5" rx="1" />
        <rect x="18" y="17" width="4" height="4" rx="1" />
        <path d="M17 7.5l-3 3.5" />
        <path d="M15 13.5l1.5 3" />
      </svg>
    ),
  },
  {
    slug: 'taskFlow',
    name: '任务流程图',
    description: '可视化任务执行流程，清晰呈现步骤与决策节点。',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h3m1-6h4m0 0v6m0-6l2 2m-2-2l-2 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h5m0 0l2-2m-2 2l2 2" />
        <circle cx="4" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
        <path d="M12 6v3" />
        <path d="M12 15v3" />
      </svg>
    ),
  },
];

export default function PluginListPage() {
  return (
    <main className="main">
      <section className="panel" style={{ animationDelay: '0ms' }}>
        <div className="panel-title">
          <span>工具箱</span>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>2 个可用插件</span>
        </div>
        <div className="plugin-list">
          {plugins.map((plugin, index) => (
            <Link
              key={plugin.slug}
              href={`/plugin/${plugin.slug}`}
              className="plugin-card"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="plugin-icon">
                {plugin.icon}
              </div>
              <div className="plugin-body">
                <div className="plugin-name">{plugin.name}</div>
                <div className="plugin-desc">{plugin.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
