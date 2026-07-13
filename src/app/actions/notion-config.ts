'use server';

import { PrismaClient } from '@prisma/client';
import { Client } from '@notionhq/client';
import { encrypt, decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

const API_KEY_MASK = '••••••••••••••••';
const DATABASE_ID_MASK = '••••••••••••••••';

function maskText(text: string, visibleStart = 4, visibleEnd = 4): string {
  if (!text) return '';
  if (text.length <= (visibleStart + visibleEnd)) {
    return '•'.repeat(text.length);
  }
  return text.substring(0, visibleStart) + '•'.repeat(text.length - (visibleStart + visibleEnd)) + text.substring(text.length - visibleEnd);
}

export async function getNotionConfigAction() {
  try {
    const config = await prisma.notionConfig.findFirst();
    if (!config) {
      return {
        exists: false,
        apiKey: '',
        databaseId: '',
      };
    }
    
    // Decrypt the credentials to verify they can be decrypted
    const apiKey = decrypt(config.encryptedApiKey, config.iv);
    const databaseId = decrypt(config.encryptedDatabaseId, config.iv);

    return {
      exists: true,
      apiKey: API_KEY_MASK, // Send mask to browser
      databaseId: DATABASE_ID_MASK, // Send mask to browser
      maskedApiKey: maskText(apiKey, 6, 4),
      maskedDatabaseId: maskText(databaseId, 4, 4),
    };
  } catch (error) {
    console.error('Error fetching Notion config:', error);
    return {
      exists: false,
      apiKey: '',
      databaseId: '',
      error: 'Failed to retrieve configuration',
    };
  }
}

export async function saveNotionConfigAction(apiKey: string, databaseId: string) {
  try {
    if (!apiKey || !databaseId) {
      throw new Error('API Key and Database ID are required');
    }

    const existingConfig = await prisma.notionConfig.findFirst();
    let finalApiKey = apiKey;
    let finalDatabaseId = databaseId;

    // If the input is the mask placeholder, retrieve the existing value
    if (existingConfig) {
      const decryptedApiKey = decrypt(existingConfig.encryptedApiKey, existingConfig.iv);
      const decryptedDatabaseId = decrypt(existingConfig.encryptedDatabaseId, existingConfig.iv);

      if (apiKey === API_KEY_MASK || apiKey === maskText(decryptedApiKey, 6, 4)) {
        finalApiKey = decryptedApiKey;
      }
      if (databaseId === DATABASE_ID_MASK || databaseId === maskText(decryptedDatabaseId, 4, 4)) {
        finalDatabaseId = decryptedDatabaseId;
      }
    }

    // Encrypt new values
    const { iv, encryptedData: encApiKey } = encrypt(finalApiKey);
    const { encryptedData: encDatabaseId } = encrypt(finalDatabaseId);

    if (existingConfig) {
      await prisma.notionConfig.update({
        where: { id: existingConfig.id },
        data: {
          encryptedApiKey: encApiKey,
          encryptedDatabaseId: encDatabaseId,
          iv,
        },
      });
    } else {
      await prisma.notionConfig.create({
        data: {
          encryptedApiKey: encApiKey,
          encryptedDatabaseId: encDatabaseId,
          iv,
        },
      });
    }

    revalidatePath('/');
    revalidatePath('/notion-config');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving Notion config:', error);
    return { success: false, error: error.message || 'Failed to save configuration' };
  }
}

export async function testNotionConnectionAction(apiKey: string, databaseId: string) {
  try {
    if (!apiKey || !databaseId) {
      throw new Error('API Key and Database ID are required');
    }

    let finalApiKey = apiKey;
    let finalDatabaseId = databaseId;

    const existingConfig = await prisma.notionConfig.findFirst();
    if (existingConfig) {
      const decryptedApiKey = decrypt(existingConfig.encryptedApiKey, existingConfig.iv);
      const decryptedDatabaseId = decrypt(existingConfig.encryptedDatabaseId, existingConfig.iv);

      if (apiKey === API_KEY_MASK || apiKey === maskText(decryptedApiKey, 6, 4)) {
        finalApiKey = decryptedApiKey;
      }
      if (databaseId === DATABASE_ID_MASK || databaseId === maskText(decryptedDatabaseId, 4, 4)) {
        finalDatabaseId = decryptedDatabaseId;
      }
    }

    // Connect to Notion
    const notion = new Client({ auth: finalApiKey });
    
    // Retrieve metadata
    let activeDataSourceId = finalDatabaseId;
    let dbMetadata: any;
    try {
      dbMetadata = await notion.databases.retrieve({ database_id: finalDatabaseId });
      if (dbMetadata.data_sources?.[0]?.id) {
        activeDataSourceId = dbMetadata.data_sources[0].id;
        // Optionally query details using active datasource if it is a sync db
      }
    } catch (err: any) {
      throw new Error(`Failed to retrieve Notion database: ${err.message}`);
    }

    const properties = dbMetadata.properties || {};
    const dbTitle = dbMetadata.title?.map((t: any) => t.plain_text).join('') || 'Untitled Notion Database';
    
    // Schema definitions
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
      // Find actual property matching key or aliases case-sensitively
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

    return {
      success: true,
      dbTitle,
      maskedDatabaseId: maskText(finalDatabaseId, 4, 4),
      schemaComparison,
      isSchemaCompatible,
    };
  } catch (error: any) {
    console.error('Error testing Notion connection:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Notion',
    };
  }
}
