import type { FlowchartGraph } from '@/core/plugins/taskFlow/schema';

export function flowchartToMermaid(tf: FlowchartGraph): string {
  const { nodes, edges, title } = tf;

  const lines: string[] = [];
  lines.push(`%% ${title}`);
  lines.push('graph TD');

  const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Mermaid node labels break on quotes/brackets; normalize instead of quoting.
  const safeLabel = (label: string) => {
    return label
      .replace(/"/g, '＂')
      .replace(/\[/g, '【')
      .replace(/\]/g, '】')
      .replace(/\(/g, '（')
      .replace(/\)/g, '）')
      .replace(/\{/g, '｛')
      .replace(/\}/g, '｝')
      .replace(/\|/g, '¦');
  };

  for (const node of nodes) {
    const label = safeLabel(node.label);

    let shape = `[${label}]`;
    switch (node.type) {
      case 'start':
      case 'end':
        shape = `(${label})`;
        break;
      case 'decision':
        shape = `{${label}}`;
        break;
      case 'io':
        shape = `[/${label}/]`;
        break;
      case 'subprocess':
        shape = `[[${label}]]`;
        break;
      default:
        shape = `[${label}]`;
    }

    lines.push(`  ${safeId(node.id)}${shape}`);
  }

  for (const edge of edges) {
    const from = safeId(edge.from);
    const to = safeId(edge.to);
    const label = edge.label ? `|${safeLabel(edge.label)}|` : '';
    lines.push(`  ${from} -->${label} ${to}`);
  }

  return lines.join('\n');
}
