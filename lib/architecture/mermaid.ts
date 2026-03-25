import type { ArchitectureJson, ArchitectureComponent, ArchitectureConnection } from '@/core/types';

/**
 * 将 ArchitectureJson 转换为 Mermaid flowchart 语法
 *
 * 输出示例：
 * ```mermaid
 * flowchart TB
 *   subgraph presentation [表现层]
 *     frontend[前端应用<br/>React]
 *   end
 *   subgraph application [应用层]
 *     backend[后端服务<br/>Node.js]
 *     api[API 网关]
 *   end
 *   frontend -->|http| api
 *   api -->|http| backend
 *   backend -->|database| db[(数据库)]
 * ```
 */
export function architectureToMermaid(architecture: ArchitectureJson): string {
  const lines: string[] = [];
  const { components, connections = [], style } = architecture;

  // 1. 图表方向：TB (从上到下)
  lines.push('flowchart TB');
  lines.push('');

  // 2. 按架构层分组生成 subgraph
  const layers = groupByLayer(components);
  const layerOrder = ['presentation', 'application', 'domain', 'infrastructure', 'data'];

  // 按预定义顺序输出层
  for (const layerName of layerOrder) {
    const comps = layers.get(layerName);
    if (!comps || comps.length === 0) continue;

    const layerLabel = getLayerLabel(layerName);
    lines.push(`  subgraph ${sanitizeId(layerName)} [${layerLabel}]`);

    for (const comp of comps) {
      const nodeDef = formatMermaidNode(comp);
      lines.push(`    ${nodeDef}`);
    }
    lines.push('  end');
    lines.push('');
  }

  // 3. 生成连接关系
  for (const conn of connections) {
    const edgeDef = formatMermaidEdge(conn);
    lines.push(`  ${edgeDef}`);
  }

  // 4. 样式定义
  lines.push('');
  const styles = generateMermaidStyles(components);
  lines.push(...styles);

  return lines.join('\n');
}

/**
 * 按架构层分组组件
 */
function groupByLayer(components: ArchitectureComponent[]): Map<string, ArchitectureComponent[]> {
  const layers = new Map<string, ArchitectureComponent[]>();

  for (const comp of components) {
    const layer = comp.layer || 'domain';
    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer)!.push(comp);
  }

  return layers;
}

/**
 * 获取架构层的中文标签
 */
function getLayerLabel(layerName: string): string {
  const labels: Record<string, string> = {
    presentation: '表现层',
    application: '应用层',
    domain: '领域层',
    infrastructure: '基础设施层',
    data: '数据层',
  };
  return labels[layerName] || layerName;
}

/**
 * 清理 ID 使其符合 Mermaid 语法
 * Mermaid ID 只能包含字母、数字、下划线和连字符
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * 转义 Mermaid 文本标签，避免括号、引号、换行和尖括号导致解析失败。
 */
function escapeMermaidLabel(label: string): string {
  return label
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r?\n/g, '<br/>');
}

/**
 * 格式化 Mermaid 节点定义
 * 根据组件类型选择不同的形状：
 * - database: [(名称)]
 * - queue: {{名称}}
 * - external-api: [[名称]]
 * - cache: [（名称）]
 * - 默认: [名称]
 */
function formatMermaidNode(comp: ArchitectureComponent): string {
  const safeId = sanitizeId(comp.id);
  const rawLabel = comp.technology
    ? `${comp.name}\n${comp.technology}`
    : comp.name;
  const label = escapeMermaidLabel(rawLabel);

  switch (comp.type) {
    case 'database':
      return `${safeId}[("${label}")]`;
    case 'queue':
      return `${safeId}{{"${label}"}}`;
    case 'external-api':
      return `${safeId}[["${label}"]]`;
    case 'cache':
      return `${safeId}[("${label}")]`;
    case 'storage':
      return `${safeId}[("${label}")]`;
    default:
      return `${safeId}["${label}"]`;
  }
}

/**
 * 格式化 Mermaid 边定义
 * 使用不同的线型表示不同的连接类型
 */
function formatMermaidEdge(conn: ArchitectureConnection): string {
  const sourceId = sanitizeId(conn.from);
  const targetId = sanitizeId(conn.to);
  const label = escapeMermaidLabel(conn.label || conn.type);

  switch (conn.type) {
    case 'websocket':
      return `${sourceId} -.->|"${label}"| ${targetId}`;
    case 'cache':
    case 'queue':
      return `${sourceId} -.->|"${label}"| ${targetId}`;
    case 'grpc':
      return `${sourceId} ==>|"${label}"| ${targetId}`;
    default:
      return `${sourceId} -->|"${label}"| ${targetId}`;
  }
}

/**
 * 生成 Mermaid 样式定义
 * 为不同类型节点定义颜色
 */
function generateMermaidStyles(components: ArchitectureComponent[]): string[] {
  const styles: string[] = [];

  // 为不同类型节点定义颜色
  const typeStyles: Record<string, string> = {
    frontend: 'fill:#3b82f6,color:#fff',
    backend: 'fill:#10b981,color:#fff',
    database: 'fill:#f59e0b,color:#fff',
    cache: 'fill:#ef4444,color:#fff',
    queue: 'fill:#8b5cf6,color:#fff',
    'api-gateway': 'fill:#06b6d4,color:#fff',
    'auth-service': 'fill:#ec4899,color:#fff',
    storage: 'fill:#6366f1,color:#fff',
    cdn: 'fill:#14b8a6,color:#fff',
    'external-api': 'fill:#64748b,color:#fff',
  };

  for (const comp of components) {
    const style = typeStyles[comp.type];
    if (style) {
      const safeId = sanitizeId(comp.id);
      styles.push(`style ${safeId} ${style}`);
    }
  }

  return styles;
}

/**
 * 下载 Mermaid 文件
 */
export function downloadMermaidFile(architecture: ArchitectureJson): void {
  const mermaidCode = architectureToMermaid(architecture);
  const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const fileName = architecture.title
    ? architecture.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-')
    : 'architecture';
  link.download = `${fileName}.mmd`;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * 复制 Mermaid 代码到剪贴板
 */
export async function copyMermaidToClipboard(architecture: ArchitectureJson): Promise<boolean> {
  const mermaidCode = architectureToMermaid(architecture);

  try {
    await navigator.clipboard.writeText(mermaidCode);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = mermaidCode;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
