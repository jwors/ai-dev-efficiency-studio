import { NextResponse } from 'next/server';
import { listArtifactRecords } from '@/core/artifacts/store';

export async function GET() {
  const items = await listArtifactRecords();
  return NextResponse.json({ items });
}
