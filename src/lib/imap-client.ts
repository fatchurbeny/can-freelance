import tls from 'tls';
import { parseCanvaEmailText, ParsedCanvaEmail } from './canva-email-parser';

export interface ImapConnectionConfig {
  host: string;
  port: number;
  email: string;
  password?: string;
  oauthToken?: string;
}

export async function fetchCanvaEmailsFromImap(
  config: ImapConnectionConfig,
  accounts: Array<{ id: string; displayName: string }>
): Promise<ParsedCanvaEmail[]> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(config.port, config.host, { rejectUnauthorized: false }, () => {
      // Socket connected
    });

    let tagIndex = 1;
    let buffer = '';
    const emails: ParsedCanvaEmail[] = [];

    const send = (cmd: string) => {
      const tag = `A${tagIndex++}`;
      socket.write(`${tag} ${cmd}\r\n`);
      return tag;
    };

    let currentTag = '';
    let step = 'INIT';

    socket.setEncoding('utf8');

    socket.on('data', (data) => {
      buffer += data;

      if (step === 'INIT' && buffer.includes('* OK')) {
        buffer = '';
        if (config.oauthToken) {
          const authString = Buffer.from(`user=${config.email}\x01auth=Bearer ${config.oauthToken}\x01\x01`).toString('base64');
          currentTag = send(`AUTHENTICATE XOAUTH2 ${authString}`);
        } else if (config.password) {
          currentTag = send(`LOGIN "${config.email}" "${config.password}"`);
        } else {
          socket.end();
          return resolve([]);
        }
        step = 'LOGIN';
      } else if (step === 'LOGIN' && buffer.includes(`${currentTag} OK`)) {
        buffer = '';
        currentTag = send('SELECT INBOX');
        step = 'SELECT';
      } else if (step === 'SELECT' && buffer.includes(`${currentTag} OK`)) {
        buffer = '';
        // Search ALL emails (UNREAD & READ) with Canva subject
        currentTag = send('SEARCH SUBJECT "issues with your template"');
        step = 'SEARCH';
      } else if (step === 'SEARCH' && buffer.includes(`${currentTag} OK`)) {
        const searchLines = buffer.split('\r\n').filter((l) => l.startsWith('* SEARCH'));
        const uids: string[] = [];
        for (const line of searchLines) {
          const parts = line.replace('* SEARCH', '').trim().split(/\s+/);
          parts.forEach((p) => p && uids.push(p));
        }

        buffer = '';
        if (uids.length === 0) {
          send('LOGOUT');
          socket.end();
          return resolve([]);
        }

        // Fetch last 20 emails
        const fetchSet = uids.slice(-20).join(',');
        currentTag = send(`FETCH ${fetchSet} (BODY[TEXT] BODY[HEADER.FIELDS (SUBJECT FROM TO DATE MESSAGE-ID)])`);
        step = 'FETCH';
      } else if (step === 'FETCH' && buffer.includes(`${currentTag} OK`)) {
        // Parse IMAP fetch output
        const rawItems = buffer.split('* ');
        for (const item of rawItems) {
          if (!item.includes('FETCH')) continue;

          const msgIdMatch = item.match(/Message-ID:\s*<([^>]+)>/i);
          const subjectMatch = item.match(/Subject:\s*([^\r\n]+)/i);
          const fromMatch = item.match(/From:\s*([^\r\n]+)/i);
          const toMatch = item.match(/To:\s*([^\r\n]+)/i);
          const dateMatch = item.match(/Date:\s*([^\r\n]+)/i);

          const messageId = msgIdMatch ? msgIdMatch[1] : `canva_fetched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const subject = subjectMatch ? subjectMatch[1].trim() : 'We’ve found some issues with your template';
          const sender = fromMatch ? fromMatch[1].trim() : 'Canva <notifications@canva.com>';
          const recipient = toMatch ? toMatch[1].trim() : config.email;
          const receivedAt = dateMatch ? new Date(dateMatch[1]) : new Date();

          const parsed = parseCanvaEmailText({
            messageId,
            subject,
            sender,
            recipient,
            receivedAt,
            rawBody: item,
            accounts,
          });

          emails.push(parsed);
        }

        send('LOGOUT');
        socket.end();
        return resolve(emails);
      }
    });

    socket.on('error', (err) => {
      console.warn('IMAP connection socket warning:', err.message);
      resolve([]);
    });

    socket.on('end', () => {
      resolve(emails);
    });

    setTimeout(() => {
      try { socket.destroy(); } catch (_) {}
      resolve(emails);
    }, 8000);
  });
}
