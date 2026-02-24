// lib/flowchart/mermaid.ts
import type { FlowchartGraph } from '@/core/plugins/taskFlow/schema';

export function flowchartToMermaid(tf: FlowchartGraph): string {
  const { nodes, edges, title } = tf;

  const lines: string[] = [];
  lines.push(`%% ${title}`);
  lines.push('graph TD');

  // 节点 ID 只允许字母、数字、下划线、连字符
  const safeId = (id: string) => {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  // ✅ 标签中有特殊字符时，用引号包裹
  const safeLabel = (label: string) => {
    // 如果标签包含特殊字符，用双引号包裹并转义内部引号
    const hasSpecialChars = /[()[\]{}]/.test(label);
    if (hasSpecialChars) {
      return `"${label.replace(/"/g, '\\"')}"`;
    }
    return label;
  };

  // 定义节点
  for (const node of nodes) {
    const label = safeLabel(node.label);
    
    let shape = `[${label}]`; // 默认矩形

    switch (node.type) {
      case 'start':
      case 'end':
        shape = `(${label})`; // 圆形
        break;
      case 'decision':
        shape = `{${label}}`; // 菱形
        break;
      case 'io':
        shape = `[( ${label} )]`; // 平行四边形/IO
        break;
      case 'parallel':
        shape = `[${label}]`; 
        break;
      case 'subprocess':
        shape = `[[${label}]]`; // 双矩形
        break;
      default:
        shape = `[${label}]`;
    }

    lines.push(`  ${safeId(node.id)}${shape}`);
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