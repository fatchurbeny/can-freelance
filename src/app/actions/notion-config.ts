'use server';

import prisma from '@/lib/prisma';
import { Client } from '@notionhq/client';
import { encrypt, decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

const API_KEY_MASK = '••••••••••••••••';

function maskText(text: string, visibleStart = 4, visibleEnd = 4): string {
  if (!text) return '';
  if (text.length <= (visibleStart + visibleEnd)) {
    return '•'.repeat(text.length);
  }
  return text.substring(0, visibleStart) + '•'.repeat(text.length - (visibleStart + visibleEnd)) + text.substring(text.length - visibleEnd);
}

export async function getNotionConfigAction() {
  try {
    const config = await prisma.notionConfig.findFirst({
      include: { databases: true }
    });
    if (!config) {
      return {
        exists: false,
        workspaceName: '',
        apiKey: '',
        autoSync: false,
        syncInterval: '15_mins',
        databases: [],
      };
    }
    
    const apiKey = decrypt(config.encryptedApiKey, config.iv);

    const databases = config.databases.map(db => {
      const dbId = decrypt(db.encryptedDatabaseId, db.iv);
      return {
        id: db.id,
        name: db.name,
        maskedDatabaseId: maskText(dbId, 4, 4),
      };
    });

    return {
      exists: true,
      workspaceName: config.workspaceName,
      apiKey: API_KEY_MASK,
      maskedApiKey: maskText(apiKey, 6, 4),
      autoSync: config.autoSync,
      syncInterval: config.syncInterval,
      databases,
    };
  } catch (error) {
    console.error('Error fetching Notion config:', error);
    return {
      exists: false,
      workspaceName: '',
      apiKey: '',
      autoSync: false,
      syncInterval: '15_mins',
      databases: [],
      error: 'Failed to retrieve configuration',
    };
  }
}

export async function saveNotionWorkspaceAction(workspaceName: string, apiKey: string) {
  try {
    if (!workspaceName || !apiKey) {
      throw new Error('Workspace Name and API Key are required');
    }

    const existingConfig = await prisma.notionConfig.findFirst();
    let finalApiKey = apiKey;

    if (existingConfig) {
      const decryptedApiKey = decrypt(existingConfig.encryptedApiKey, existingConfig.iv);
      if (apiKey === API_KEY_MASK || apiKey === maskText(decryptedApiKey, 6, 4)) {
        finalApiKey = decryptedApiKey;
      }
    }

    const { iv, encryptedData: encApiKey } = encrypt(finalApiKey);

    if (existingConfig) {
      await prisma.notionConfig.update({
        where: { id: existingConfig.id },
        data: {
          workspaceName,
          encryptedApiKey: encApiKey,
          iv,
        },
      });
    } else {
      await prisma.notionConfig.create({
        data: {
          workspaceName,
          encryptedApiKey: encApiKey,
          iv,
        },
      });
    }

    revalidatePath('/');
    revalidatePath('/notion-config');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving Notion workspace config:', error);
    return { success: false, error: error.message || 'Failed to save workspace configuration' };
  }
}

export async function addNotionDatabaseAction(name: string, databaseId: string) {
  try {
    if (!name || !databaseId) {
      throw new Error('Database Name and ID are required');
    }

    const config = await prisma.notionConfig.findFirst();
    if (!config) {
      throw new Error('Please configure Notion API Key first.');
    }

    const { iv, encryptedData: encDatabaseId } = encrypt(databaseId);

    await prisma.notionDatabase.create({
      data: {
        name,
        encryptedDatabaseId: encDatabaseId,
        iv,
        configId: config.id,
      },
    });

    revalidatePath('/notion-config');
    return { success: true };
  } catch (error: any) {
    console.error('Error adding Notion database:', error);
    return { success: false, error: error.message || 'Failed to add database' };
  }
}

export async function testNotionConnectionAction(databaseId: string) {
  try {
    if (!databaseId) {
      throw new Error('Database ID is required');
    }

    const existingConfig = await prisma.notionConfig.findFirst();
    if (!existingConfig) {
       throw new Error('Please configure Notion API Key first before testing database connection.');
    }
    
    const finalApiKey = decrypt(existingConfig.encryptedApiKey, existingConfig.iv);
    const finalDatabaseId = databaseId;

    const notion = new Client({ auth: finalApiKey });
    
    let activeDataSourceId = finalDatabaseId;
    let dbMetadata: any;
    let properties: any = {};
    try {
      dbMetadata = await notion.databases.retrieve({ database_id: finalDatabaseId });
      if (dbMetadata.data_sources?.[0]?.id) {
        activeDataSourceId = dbMetadata.data_sources[0].id;
        try {
          const dsMetadata = await notion.dataSources.retrieve({ data_source_id: activeDataSourceId });
          properties = dsMetadata.properties || {};
        } catch (dsErr: any) {
          console.warn(`Could not retrieve data source metadata: ${dsErr.message}`);
          properties = dbMetadata.properties || {};
        }
      } else {
        properties = dbMetadata.properties || {};
      }
    } catch (err: any) {
      throw new Error(`Failed to retrieve Notion database: ${err.message}`);
    }
    const dbTitle = dbMetadata.title?.map((t: any) => t.plain_text).join('') || 'Untitled Notion Database';
    
    const schemaSpecs = [
      { key: 'Name', label: 'Task Name', types: ['title'], isRequired: true },
      { key: 'Designer', label: 'Designer Name', types: ['select'], isRequired: true },
      { key: 'Doctype', label: 'Doctype Output', types: ['select'], isRequired: true },
      { key: 'Pages', label: 'Pages Count', types: ['number'], isRequired: true, aliases: ['pages'] },
      { key: 'QTY-Submit', label: 'Submitted Quantity', types: ['number'], isRequired: true },
      { key: 'Design Status', label: 'Status Grouping', types: ['status', 'select'], isRequired: true },
      { key: 'Pool Rate', label: 'Doctype Rate Multiplier', types: ['number'], isRequired: false, aliases: ['Pool rate', 'pool rate'] },
      { key: 'License', label: 'Free / Pro Assets', types: ['select'], isRequired: false },
      { key: 'IND/ENG', label: 'Languages Selection', types: ['multi_select', 'select'], isRequired: false },
      { key: 'Date Aproved', label: 'Approved Date', types: ['date'], isRequired: false },
      { key: 'Task Month', label: 'Task Period', types: ['select'], isRequired: false },
      { key: 'Payroll Month', label: 'Payroll Period', types: ['select'], isRequired: false },
      { key: 'Priority', label: 'Task Priority', types: ['select'], isRequired: false },
      { key: 'Created', label: 'Created Time Tracker', types: ['date', 'created_time'], isRequired: false, aliases: ['Created date', 'Created Date', 'Created Time'] },
      { key: 'Brand', label: 'Brand / Client Account', types: ['multi_select', 'select'], isRequired: false, aliases: ['Account'] },
    ];

    const schemaComparison = schemaSpecs.map((spec) => {
      let actualPropName = properties[spec.key] ? spec.key : null;
      if (!actualPropName && spec.aliases) {
        for (const alias of spec.aliases) {
          if (properties[alias]) {
            actualPropName = alias;
            break;
          }
        }
      }

      const actualProp = actualPropName ? properties[actualPropName] : null;
      const actualType = actualProp ? actualProp.type : null;
      
      let status: 'match' | 'mismatch' | 'missing' = 'missing';
      if (actualType) {
        status = spec.types.includes(actualType) ? 'match' : 'mismatch';
      }

      return {
        key: spec.key,
        label: spec.label,
        expectedType: spec.types.join(' or '),
        actualType: actualType || null,
        actualName: actualPropName || null,
        status,
        isRequired: spec.isRequired,
      };
    });

    const isSchemaCompatible = !schemaComparison.some(s => s.isRequired && s.status !== 'match');

    // Test for Insert and Update capabilities
    const capabilities = ['Read-Content'];
    try {
      const testPage = await notion.pages.create({
        parent: { database_id: finalDatabaseId },
        properties: {}
      });
      capabilities.push('Insert-Content');
      // Archive the test page to test update and clean up
      await notion.pages.update({
        page_id: testPage.id,
        archived: true
      });
      capabilities.push('Update-Content');
    } catch (err: any) {
      // 400 Validation Error means we HAVE insert capability but we didn't provide required properties
      if (err.status === 400) {
        capabilities.push('Insert-Content');
        capabilities.push('Update-Content');
      }
    }

    return {
      success: true,
      dbTitle,
      schemaComparison,
      isSchemaCompatible,
      maskedDatabaseId: finalDatabaseId.substring(0, 4) + '...'.padEnd(16, '*') + finalDatabaseId.slice(-4),
      capabilities
    };
  } catch (error: any) {
    console.error('Error testing Notion connection:', error);
    return {
      success: false,
      error: error.message || 'Failed to test connection',
    };
  }
}

export async function saveSchedulingConfigAction(autoSync: boolean, syncInterval: string) {
  try {
    const existingConfig = await prisma.notionConfig.findFirst();
    if (!existingConfig) {
      return { success: false, error: 'Notion configuration not found. Please save API credentials first.' };
    }

    await prisma.notionConfig.update({
      where: { id: existingConfig.id },
      data: { autoSync, syncInterval },
    });

    revalidatePath('/notion-config');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving scheduling config:', error);
    return { success: false, error: error.message || 'Failed to save scheduling configuration' };
  }
}

export async function deleteNotionConfigAction() {
  try {
    const existingConfig = await prisma.notionConfig.findFirst();
    if (!existingConfig) return { success: true }; // Nothing to delete

    await prisma.notionConfig.delete({
      where: { id: existingConfig.id },
    });

    revalidatePath('/notion-config');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Notion config:', error);
    return { success: false, error: error.message || 'Failed to delete configuration' };
  }
}

export async function deleteNotionDatabaseAction(dbId: string) {
  try {
    await prisma.notionDatabase.delete({
      where: { id: dbId },
    });
    revalidatePath('/notion-config');
    revalidatePath('/notion-config/databases');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting Notion database:', error);
    return { success: false, error: error.message || 'Failed to delete database' };
  }
}

