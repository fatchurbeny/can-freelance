import { Client } from '@notionhq/client';

export const getNotionClient = (apiKey: string) => {
  return new Client({ auth: apiKey });
};
