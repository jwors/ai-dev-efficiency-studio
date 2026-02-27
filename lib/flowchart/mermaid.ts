import type { FlowchartGraph } from '@/core/plugins/taskFlow/schema';

// lib/flowchart/mermaid.ts

export function flowchartToMermaid(tf: FlowchartGraph): string {
  const { nodes, edges, title } = tf;

  const lines: string[] = [];
  lines.push(`%% ${title}`);
  lines.push('graph TD');

  // 1. ID 只需要保留字母数字下划线
  const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 2. 标签内容：只需要转义双引号，其他中文、括号、空格都保留原样
  // 因为我们会用双引号把整个标签包起来，所以里面只有双引号需要转义
  const safeLabel = (label: string) => {
    return label.replace(/"/g, "'"); // 将双引号转为单引号，避免冲突
  };

  for (const node of nodes) {
    const label = safeLabel(node.label);
    const nodeId = safeId(node.id);

    let shape = '';
    
    // 🔥 关键修改：使用 "ID[\"Label\"]" 或 'ID["Label"]' 格式
    // 这样无论 Label 里有什么字符（中文、括号、空格），都不会报错
    switch (node.type) {
      case 'start':
      case 'end':
        shape = `${nodeId}("${label}")`; 
        break;
      case 'decision':
        shape = `${nodeId}{"${label}"}`; 
        break;
      case 'io':
        shape = `${nodeId}[/"${label}"/]`; 
        break;
      case 'subprocess':
        shape = `${nodeId}[["${label}"]]`; 
        break;
      case 'parallel':
         shape = `${nodeId}[\\"${label}\\"]`; // 平行四边形有时需要转义，或者直接用普通矩形
         break;
      default:
        shape = `${nodeId}["${label}"]`; 
    }

    lines.push(`  ${shape}`);
  }

  for (const edge of edges) {
    const from = safeId(edge.from);
    const to = safeId(edge.to);
    // 边上的标签也用引号包裹
    const label = edge.label ? `|"${safeLabel(edge.label)}"|` : '';
    lines.push(`  ${from} -->${label} ${to}`);
  }

  return lines.join('\n');
}