// File System Abstraction
// 依赖倒置：为 executor 提供文件系统操作的抽象接口

/**
 * 文件系统接口
 * 用于解耦 executor 与 Node.js 文件系统的直接依赖
 * 方便测试和未来支持浏览器端执行
 */
export interface FileSystem {
  /**
   * 确保目录存在
   */
  ensureDir(path: string): Promise<void>;

  /**
   * 写入文件
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * 读取文件
   */
  readFile(path: string): Promise<string>;

  /**
   * 检查文件是否存在
   */
  exists(path: string): Promise<boolean>;

  /**
   * 删除文件
   */
  deleteFile(path: string): Promise<void>;
}

/**
 * 路径工具接口
 */
export interface PathResolver {
  /**
   * 解析绝对路径
   */
  resolve(...paths: string[]): string;

  /**
   * 获取目录名
   */
  dirname(path: string): string;

  /**
   * 获取文件名
   */
  basename(path: string): string;

  /**
   * 获取扩展名
   */
  extname(path: string): string;

  /**
   * 路径分隔符
   */
  readonly sep: string;
}

/**
 * 文件系统提供者接口
 */
export interface FileSystemProvider {
  fs: FileSystem;
  path: PathResolver;
  workspaceRoot: string;
}

/**
 * Node.js 文件系统实现
 */
import fs from 'node:fs/promises';
import path from 'node:path';

class NodeFileSystem implements FileSystem {
  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf8');
  }

  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }
}

class NodePathResolver implements PathResolver {
  get sep(): string {
    return path.sep;
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  basename(filePath: string): string {
    return path.basename(filePath);
  }

  extname(filePath: string): string {
    return path.extname(filePath);
  }
}

/**
 * 创建 Node.js 文件系统提供者
 */
export function createNodeFileSystemProvider(): FileSystemProvider {
  return {
    fs: new NodeFileSystem(),
    path: new NodePathResolver(),
    workspaceRoot: process.cwd(),
  };
}

/**
 * 验证路径是否在安全范围内（防止路径逃逸）
 */
export function ensureWorkspacePath(
  filePath: string,
  provider: FileSystemProvider,
): string {
  const resolved = provider.path.resolve(provider.workspaceRoot, filePath);
  if (!resolved.startsWith(provider.workspaceRoot)) {
    throw new Error('路径超出工作目录，不允许访问');
  }
  return resolved;
}