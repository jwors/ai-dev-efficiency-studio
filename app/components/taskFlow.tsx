// components/TaskFlow.tsx
'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { FlowchartGraph } from '@/core/plugins/taskFlow/schema';
import { flowchartToMermaid } from '@/lib/flowchart/mermaid';

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: any) => void;
      contentLoaded: () => void;
    };
  }
}

interface TaskFlowProps {
  tf: FlowchartGraph | null;
}

export function TaskFlow({ tf }: TaskFlowProps) {
  useEffect(() => {
    // 动态加载 Mermaid（避免 SSR 问题）
    if (typeof window !== 'undefined' && !window.mermaid) {
      import('mermaid').then((mermaid) => {
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });
        if (document.querySelector('.mermaid')) {
          mermaid.default.contentLoaded();
        }
      });
    } else if (window.mermaid) {
      // 如果已加载，重新渲染
      setTimeout(() => {
        window.mermaid?.contentLoaded();
      }, 100);
    }
  }, [tf]);

  if (!tf) {
    return <div className="empty">No task flow generated yet.</div>;
  }

  const mermaidCode = flowchartToMermaid(tf);
  const markdown = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;

  return (
    <div className="mermaid-container">
      <ReactMarkdown
        children={markdown}
        rehypePlugins={[rehypeRaw]}
      />
    </div>
  );
}