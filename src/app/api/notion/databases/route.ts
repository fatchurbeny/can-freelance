import { NextResponse } from 'next/server';
import { getNotionClient } from '@/lib/notion';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { authorizeApi } from '@/lib/api-auth';

export async function GET() {
  const denied = await authorizeApi('integration.manage');
  if (denied) return denied;
  try {
    const dbConfig = await prisma.notionConfig.findFirst();
    if (!dbConfig) return NextResponse.json({ error: 'Config missing' }, { status: 404 });

    const apiKey = decrypt(dbConfig.encryptedApiKey, dbConfig.iv);
    const notion = getNotionClient(apiKey);
    
    const response = await notion.search({
      page_size: 100,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Notion Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
