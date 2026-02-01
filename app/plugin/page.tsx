'use client';

import Link from 'next/link';

const plugins = [
  {
    slug: 'wbs',
    name: 'WBS 任务拆解图',
    description: '根据多轮对话生成任务结构与依赖关系。',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 5h6v4H4V5zm10 0h6v4h-6V5zM9 15h6v4H9v-4zM7 9h2v3H7V9zm8 0h2v3h-2V9zM8 12h8v2H8v-2z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export default function PluginListPage() {
  return (
    <main className="main">
      <section className="panel">
        <div className="panel-title">插件列表</div>
        <div className="plugin-list">
          {plugins.map((plugin) => (
            <Link
              key={plugin.slug}
              href={`/plugin/${plugin.slug}`}
              className="plugin-card"
            >
              <div className="plugin-icon">{plugin.icon}</div>
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
