import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPrisma } from '@/lib/prisma';
import type { ArtifactRecord } from '@/core/types/type';

const workspaceRoot = path.resolve(process.cwd());
const artifactsDir = path.resolve(workspaceRoot, 'public', 'artifacts');
const indexPath = path.join(artifactsDir, 'index.json');
const MAX_RECORDS = 200;
const prisma = getPrisma();
let dbDisabled = false;
async function readIndex(): Promise<ArtifactRecord[]> {
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data?.items) ? (data.items as ArtifactRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(items: ArtifactRecord[]) {
  await fs.mkdir(artifactsDir, { recursive: true });
  const payload = {
    updatedAt: Date.now(),
    items,
  };
  await fs.writeFile(indexPath, JSON.stringify(payload, null, 2), 'utf8');
}

export async function addArtifactRecord(record: ArtifactRecord) {
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
