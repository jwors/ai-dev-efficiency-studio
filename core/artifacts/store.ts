import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import type { ArtifactRecord } from '@/core/types';

const workspaceRoot = path.resolve(process.cwd());
const artifactsDir = path.resolve(workspaceRoot, 'public', 'artifacts');
const indexPath = path.join(artifactsDir, 'index.json');
const MAX_RECORDS = 200;
let dbDisabled = false;

/**
 * 读取制品索引文件。
 * @returns 制品记录数组，读取失败时返回空数组
 */
async function readIndex(): Promise<ArtifactRecord[]> {
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data?.items) ? (data.items as ArtifactRecord[]) : [];
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to read artifact index');
    if (error instanceof Error && 'code' in error && (error as { code: string }).code !== 'ENOENT') {
      console.error('Error reading artifact index:', err.message);
    }
    return [];
  }
}

/**
 * 写入制品索引文件。
 * @param items - 制品记录数组
 */
async function writeIndex(items: ArtifactRecord[]) {
  await fs.mkdir(artifactsDir, { recursive: true });
  const payload = {
    updatedAt: Date.now(),
    items,
  };
  await fs.writeFile(indexPath, JSON.stringify(payload, null, 2), 'utf8');
}

/**
 * 添加制品记录。
 * 优先写入数据库，失败时降级为文件存储。
 * @param record - 制品记录
 */
async function addArtifactRecord(record: ArtifactRecord) {
  if (!dbDisabled) {
    try {
      await prisma.artifact.create({
        data: {
          id: record.id,
          path: record.path,
          url: record.url,
          filename: record.filename,
          kind: record.kind,
          size: record.size,
          createdAt: new Date(record.createdAt),
        },
      });
      return;
    } catch {
      dbDisabled = true;
    }
  }
  const items = await readIndex();
  const filtered = items.filter((item) => item.path !== record.path);
  filtered.unshift(record);
  await writeIndex(filtered.slice(0, MAX_RECORDS));
}

/**
 * 列出所有制品记录。
 * 优先从数据库读取，失败时降级为文件存储。
 * @returns 制品记录数组
 */
export async function listArtifactRecords(): Promise<ArtifactRecord[]> {
  if (!dbDisabled) {
    try {
      const rows = await prisma.artifact.findMany({
        orderBy: { createdAt: 'desc' },
        take: MAX_RECORDS,
      });
      return rows.map((row) => ({
        id: row.id,
        path: row.path,
        url: row.url,
        filename: row.filename,
        kind: row.kind,
        size: row.size,
        createdAt: row.createdAt.getTime(),
      }));
    } catch {
      dbDisabled = true;
    }
  }
  return readIndex();
}
