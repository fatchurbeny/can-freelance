export interface ParsedCanvaEmail {
  messageId: string;
  subject: string;
  sender: string;
  recipient?: string;
  receivedAt: Date;
  brandName?: string;
  templateTitle?: string;
  templateUrl?: string;
  issueMessages: string[];
  rawBody: string;
}

function textFromEmailBody(rawBody: string) {
  return rawBody
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function isIssueBoilerplate(line: string) {
  return [
    /^unfortunately/i,
    /^if you would like/i,
    /^for the moment/i,
    /^edit template\b/i,
    /^issues?$/i,
    /^read more/i,
    /^what.?s next/i,
    /^for tips/i,
    /^you.?re receiving/i,
    /^canva pty/i,
    /^abn /i,
    /^privacy policy/i,
    /^https?:\/\//i,
    /^<!doctype/i,
    /^html\b/i,
    /^head\b/i,
    /^meta\b/i,
    /^style\b/i,
    /^body\b/i,
    /unsubscribe/i,
    /template-baseline-review-criteria/i,
    /creator resources/i,
  ].some((pattern) => pattern.test(line));
}

function isCanvaIssueTitle(line: string) {
  return /^(inappropriate content|lacks commercial value|quality issues?|copyright|trademark|prohibited content|unsupported language|incorrect category|unclear use case|template doesn.?t meet minimum category requirements)$/i.test(line);
}

function isCanvaIssueDescription(line: string) {
  return /(contains |doesn.?t meet|has an |includes |cannot be |incorrect |spelling|grammar|brand\/individual|not safe|commercial value|copyright|trademark|prohibited|unclear use case|unsuitable|inconsistent design|unverified specialist)/i.test(line);
}

function extractIssueMessages(rawBody: string) {
  const text = textFromEmailBody(rawBody);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d+.\s]+/, '').trim())
    .filter(Boolean);

  const issues: string[] = [];
  let capturing = false;
  let activeTitle = '';
  let activeDescription: string[] = [];

  const flushActiveIssue = () => {
    if (!activeTitle) return;
    const description = activeDescription.join(' ').trim();
    const issue = description ? `${activeTitle} — ${description}` : activeTitle;
    if (!issues.includes(issue)) issues.push(issue);
    activeTitle = '';
    activeDescription = [];
  };

  for (const line of lines) {
    if (/^issues?$/i.test(line) || /issues (?:found|reported|with your template):?/i.test(line)) {
      capturing = true;
      continue;
    }
    if (!capturing) continue;
    if (/^what.?s next/i.test(line) || /^(thank you|best regards|canva review team)/i.test(line)) {
      flushActiveIssue();
      break;
    }
    if (isIssueBoilerplate(line)) continue;
    if (line.length < 5 || line.length > 320) continue;

    if (isCanvaIssueTitle(line)) {
      flushActiveIssue();
      activeTitle = line;
      continue;
    }

    if (activeTitle && isCanvaIssueDescription(line)) {
      activeDescription.push(line);
      continue;
    }

    if (!activeTitle && isCanvaIssueDescription(line)) {
      if (!issues.includes(line)) issues.push(line);
    }

    if (issues.length >= 6) break;
  }
  flushActiveIssue();

  if (issues.length === 0) {
    for (const line of lines) {
      if (isIssueBoilerplate(line)) continue;
      if (/(inappropriate content|commercial value|minimum category|unclear use case|unsuitable|inconsistent design|spelling|grammar|copyright|trademark|unsafe|unverified specialist)/i.test(line)) {
        if (!issues.includes(line)) issues.push(line);
      }
      if (issues.length >= 6) break;
    }
  }

  return issues;
}

function extractTemplateTitleFromCanvaBody(rawBody: string, brandName?: string): string | undefined {
  const plain = textFromEmailBody(rawBody);
  const lines = plain.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Find line containing Edit Template or Canva design URL
  const editIdx = lines.findIndex((l) => /edit template/i.test(l) || /canva\.com\/design\//i.test(l));

  if (editIdx > 0) {
    // Scan lines above Edit Template link for candidate title (skipping studio/brand line at editIdx - 1)
    for (let i = editIdx - 1; i >= Math.max(0, editIdx - 4); i--) {
      const line = lines[i];
      if (
        line.length >= 3 &&
        line.length <= 120 &&
        !/^(issues?|unfortunately|if you would|for the moment|what.?s next|you.?re receiving|canva pty|edit template)$/i.test(line) &&
        (!brandName || line.toLowerCase() !== brandName.toLowerCase()) &&
        !/^(UICreative\.net|UICreative|Ui Creative\.net|Chital Graphic|Zahra Art|Improstd|Antler|Teman Siswa|Humpback Studio|Humpback|Impro Studio|Chital)$/i.test(line)
      ) {
        return line;
      }
    }
  }

  // 2. Check URL slug
  const slugMatch = rawBody.match(/canva\.com\/design\/[a-zA-Z0-9_-]+\/([a-zA-Z0-9_-]+)\/edit/i);
  if (slugMatch && slugMatch[1] && slugMatch[1].length > 2 && !/^(design|edit|template|view)$/i.test(slugMatch[1])) {
    const rawSlug = slugMatch[1].replace(/[-_]+/g, ' ').trim();
    const formattedSlug = rawSlug
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return formattedSlug;
  }

  // 3. Quoted title matches
  const titleMatch1 = plain.match(/submission for ["'‘“]([^"'’”]+)["'’]/i);
  const titleMatch2 = plain.match(/issues with your template ["'‘“]([^"'’”]+)["'’]/i);
  if (titleMatch1) return titleMatch1[1].trim();
  if (titleMatch2) return titleMatch2[1].trim();

  // 4. Category pattern match
  const titleMatch3 = plain.match(/(?:Presentation|Carousel|Infographic|Flyer|Poster|Deck|Design|Workflow)\s+[^\r\n]+/i);
  if (titleMatch3) return titleMatch3[0].trim();

  return undefined;
}

export function cleanTemplateTitle(rawTitle?: string, brandName?: string): string {
  if (!rawTitle) return 'Canva Marketplace Template';
  let title = rawTitle.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  const brandList = [
    brandName,
    'UICreative.net',
    'UICreative',
    'Ui Creative.net',
    'Impro Studio',
    'Improstd',
    'Humpback Studio',
    'Humpback',
    'Chital Graphic',
    'Zahra Art',
    'Teman Siswa',
    'Antler',
  ].filter(Boolean) as string[];

  for (const b of brandList) {
    const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`\\s+${escaped}$`, 'i'), '');
    title = title.replace(new RegExp(`^${escaped}\\s+`, 'i'), '');
  }

  if (brandName) {
    const brandWords = brandName.split(/\s+/).filter((w) => w.length > 2);
    for (const word of brandWords) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(`\\s+${escapedWord}(?:\\s+Graphic|\\s+Studio)?$`, 'i'), '');
    }
  }

  title = title.replace(/\s+Graphic$/i, '').replace(/\s+Studio$/i, '').trim();
  return title || 'Canva Marketplace Template';
}

export function parseCanvaEmailText(params: {
  messageId: string;
  subject?: string;
  sender?: string;
  recipient?: string;
  receivedAt?: Date | string;
  rawBody: string;
  accounts?: Array<{ id: string; displayName: string }>;
}): ParsedCanvaEmail {
  const subject = params.subject || 'We’ve found some issues with your template';
  const sender = params.sender || 'Canva <no-reply@canva.com>';
  const rawBody = params.rawBody;
  const receivedAt = params.receivedAt ? new Date(params.receivedAt) : new Date();

  // 1. Extract Studio / Brand candidate directly from lines above Edit Template link
  const plain = textFromEmailBody(rawBody);
  const lines = plain.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const editIdx = lines.findIndex((l) => /edit template/i.test(l) || /canva\.com\/design\//i.test(l));

  let extractedStudio: string | undefined;
  if (editIdx > 0) {
    const lineAbove = lines[editIdx - 1];
    if (
      lineAbove &&
      lineAbove.length >= 2 &&
      lineAbove.length <= 80 &&
      !/^(issues?|unfortunately|if you would|for the moment|what.?s next|you.?re receiving|canva pty|edit template)$/i.test(lineAbove)
    ) {
      extractedStudio = lineAbove;
    }
  }

  let brandName: string | undefined;

  // Check if extractedStudio or rawBody matches a registered account
  if (params.accounts && params.accounts.length > 0) {
    const checkTarget = (extractedStudio || '') + ' ' + rawBody.toLowerCase();
    for (const acc of params.accounts) {
      const accName = acc.displayName.toLowerCase();
      const normAcc = accName.replace(/[^a-z0-9]/g, '');
      const normExtracted = (extractedStudio || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (
        (extractedStudio && normExtracted === normAcc) ||
        checkTarget.toLowerCase().includes(accName) ||
        (normAcc.includes('uicreative') && checkTarget.toLowerCase().includes('uicreative')) ||
        (normAcc.includes('uicreative') && checkTarget.toLowerCase().includes('ui creative'))
      ) {
        brandName = acc.displayName;
        break;
      }
    }
  }

  // If brand is not a registered account, use the extracted studio name (e.g. Humpback Studio)
  if (!brandName && extractedStudio) {
    brandName = extractedStudio;
  }

  // Normalize UICreative.net
  if (brandName && /uicreative/i.test(brandName)) {
    brandName = 'UICreative.net';
  }

  // 2. Extract Canva Template Link
  const urlMatch = rawBody.match(/https?:\/\/(?:www\.)?canva\.com\/design\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?(?:\/edit[^\s]*)?/i);
  const templateUrl = urlMatch ? urlMatch[0] : undefined;

  // 3. Extract Template Title using precise body scanning
  let rawTitle = extractTemplateTitleFromCanvaBody(rawBody, brandName);
  let templateTitle = cleanTemplateTitle(rawTitle, brandName);

  // 4. Extract Issue Messages
  const issueMessages = extractIssueMessages(rawBody);

  // Fallback issue message if none extracted but rawBody has content
  if (issueMessages.length === 0 && rawBody.length > 20) {
    issueMessages.push('Issues reported by Canva Quality Review team. Inspect raw email body for full details.');
  }

  return {
    messageId: params.messageId,
    subject,
    sender,
    recipient: params.recipient,
    receivedAt,
    brandName,
    templateTitle,
    templateUrl,
    issueMessages,
    rawBody,
  };
}
