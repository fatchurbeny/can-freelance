import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authorizeApi } from '@/lib/api-auth';
import { DEV_TOOLS_ENABLED } from '@/lib/dev-tools';

export async function GET() {
  if (!DEV_TOOLS_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const denied = await authorizeApi('integration.manage');
  if (denied) return denied;
  try {
    const filePath = path.join(process.cwd(), 'graph.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'graph.json not found' }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to read graph data' }, { status: 500 });
  }
}
