// lib/flowchart/mermaid.ts
import type { FlowchartGraph } from '@/core/plugins/taskFlow/schema';

export function flowchartToMermaid(tf: FlowchartGraph): string {
  const { nodes, edges, title } = tf;

  const lines: string[] = [];
  lines.push(`%% ${title}`);
  lines.push('graph TD');

  // 节点映射：Mermaid 要求 ID 不能有特殊字符，我们用安全 ID
  const safeId = (id: string) => `"${id.replace(/[^a-zA-Z0-9_-]/g, '_')}"`;

  // 定义节点
  for (const node of nodes) {
    const label = node.label.replace(/"/g, "'");
    let shape = '([label])'; // 默认矩形

    switch (node.type) {
      case 'start':
        shape = '((Start))';
        break;
      case 'end':
        shape = '((End))';
        break;
      case 'decision':
        shape = '{label}';
        break;
      case 'parallel':
        shape = '[/label\\]';
        break;
      case 'io':
        shape = '[(label)]';
        break;
      default:
        shape = '[label]';
    }

    const mermaidLabel = shape.replace('label', label);
    lines.push(`  ${safeId(node.id)}${mermaidLabel}`);
  }

  // 定义边
  for (const edge of edges) {
    const from = safeId(edge.from);
    const to = safeId(edge.to);
    const label = edge.label ? `|"${edge.label}"|` : '';
    lines.push(`  ${from} -->${label} ${to}`);
  }

  return lines.join('\n');
}