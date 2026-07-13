const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.taskAccount.deleteMany();
  await prisma.task.deleteMany();
  await prisma.designer.deleteMany();
  await prisma.doctype.deleteMany();
  await prisma.account.deleteMany();
  await prisma.designStatus.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding metadata...');

  // 1. Users
  const user = await prisma.user.create({
    data: {
      email: 'manager@canfreelance.com',
      passwordHash: '$2b$10$EpjX0VO2yz5A5g5JZmG9xeG7aC1lA7Ue2uF3p1.mOQ1x/Q5l/61Ky', // 'password'
      name: 'Impro Manager',
      role: 'manager',
    },
  });

  // 2. Designers
  const designersData = [
    { notionKey: 'Najih', displayName: 'Najih', avatarColor: '#10B981' },
    { notionKey: 'Putry', displayName: 'Putery', avatarColor: '#6366F1' },
    { notionKey: 'Shela', displayName: 'Shela', avatarColor: '#EC4899' },
    { notionKey: 'Rizal', displayName: 'Rizal', avatarColor: '#3B82F6' },
  ];
  const designers = [];
  for (const d of designersData) {
    designers.push(await prisma.designer.create({ data: d }));
  }

  // 3. Accounts (Brands)
  const accountsData = [
    { notionKey: 'Improstudio', displayName: 'Improstd', color: '#F97316' },     // Orange
    { notionKey: 'Antler', displayName: 'Antler', color: '#EF4444' },             // Red
    { notionKey: 'Azzahra', displayName: 'Zahra Art', color: '#10B981' },         // Green
    { notionKey: 'Chital', displayName: 'Chital Graphic', color: '#EC4899' },     // Pink
    { notionKey: 'uicreative', displayName: 'Ui Creative.net', color: '#8B5CF6' }, // Purple
    { notionKey: 'Teman Siswa', displayName: 'Teman Siswa', color: '#3B82F6' },   // Blue
  ];
  const accounts = [];
  for (const a of accountsData) {
    accounts.push(await prisma.account.create({ data: a }));
  }

  // 4. Doctypes
  const doctypesData = [
    { notionKey: 'Regular-Presentation', displayName: 'Regular-Presentation', isTopSpecialist: true, sortOrder: 1 },
    { notionKey: 'Infographic-Slides', displayName: 'Infographic-Slides', isTopSpecialist: true, sortOrder: 2 },
    { notionKey: 'Regular-Sosmed', displayName: 'Regular-Sosmed', isTopSpecialist: true, sortOrder: 3 },
    { notionKey: 'Infographic-Graph', displayName: 'Infographic-Graph', isTopSpecialist: false, sortOrder: 4 },
    { notionKey: 'Infographic-Flyer', displayName: 'Infographic-Flyer', isTopSpecialist: false, sortOrder: 5 },
    { notionKey: 'Infographic-Sosmed', displayName: 'Infographic-Sosmed', isTopSpecialist: false, sortOrder: 6 },
    { notionKey: 'Flow-Process-Infographic', displayName: 'Flow-Process-Infographic', isTopSpecialist: false, sortOrder: 7 },
    { notionKey: 'Graph-Freeboard', displayName: 'Graph-Freeboard', isTopSpecialist: false, sortOrder: 8 },
    { notionKey: 'Graph', displayName: 'Graph', isTopSpecialist: false, sortOrder: 9 },
    { notionKey: 'CV-Resume', displayName: 'CV-Resume', isTopSpecialist: false, sortOrder: 10 },
    { notionKey: 'Notes/Meeting-Minutes', displayName: 'Notes/Meeting-Minutes', isTopSpecialist: false, sortOrder: 11 },
    { notionKey: 'Newsletter', displayName: 'Newsletter', isTopSpecialist: false, sortOrder: 12 },
    { notionKey: 'Spesification-Sheets', displayName: 'Spesification-Sheets', isTopSpecialist: false, sortOrder: 13 },
    { notionKey: 'Magazine', displayName: 'Magazine', isTopSpecialist: false, sortOrder: 14 },
    { notionKey: 'Banner-Ads', displayName: 'Banner-Ads', isTopSpecialist: false, sortOrder: 15 },
    { notionKey: 'calendar', displayName: 'calendar', isTopSpecialist: false, sortOrder: 16 },
    { notionKey: 'Flyer', displayName: 'Flyer', isTopSpecialist: false, sortOrder: 17 },
  ];
  const doctypes = [];
  for (const dt of doctypesData) {
    doctypes.push(await prisma.doctype.create({ data: dt }));
  }

  // 5. Design Statuses
  const statusesData = [
    { notionKey: 'Draft', displayName: 'Draft', statusGroup: 'to_do', countsAsSubmitted: false, countsAsApproved: false, countsAsProfileOnly: false },
    { notionKey: 'Not Started', displayName: 'Not Started', statusGroup: 'to_do', countsAsSubmitted: true, countsAsApproved: false, countsAsProfileOnly: false },
    { notionKey: 'In Progress', displayName: 'In Progress', statusGroup: 'in_progress', countsAsSubmitted: true, countsAsApproved: false, countsAsProfileOnly: false },
    { notionKey: 'QA', displayName: 'QA', statusGroup: 'in_progress', countsAsSubmitted: true, countsAsApproved: false, countsAsProfileOnly: false },
    { notionKey: 'In Review', displayName: 'In Review', statusGroup: 'in_progress', countsAsSubmitted: true, countsAsApproved: false, countsAsProfileOnly: false },
    { notionKey: 'Reject', displayName: 'Reject', statusGroup: 'in_progress', countsAsSubmitted: true, countsAsApproved: false, countsAsProfileOnly: false },
    { notionKey: 'Aproved', displayName: 'Aproved', statusGroup: 'complete', countsAsSubmitted: true, countsAsApproved: true, countsAsProfileOnly: false },
    { notionKey: 'Aproved-Profile Only', displayName: 'Aproved-Profile Only', statusGroup: 'complete', countsAsSubmitted: true, countsAsApproved: false, countsAsProfileOnly: true },
  ];
  const statuses = [];
  for (const s of statusesData) {
    statuses.push(await prisma.designStatus.create({ data: s }));
  }

  console.log('Seeding tasks...');
  // We want to generate tasks spanning the last 6 months (February 2026 to July 2026)
  // Total tasks: around 200 tasks
  const startMonth = new Date(2026, 1, 1); // Feb 1, 2026
  const totalTasksCount = 220;

  const statusWeights = [
    { key: 'Aproved', weight: 150 },
    { key: 'Aproved-Profile Only', weight: 15 },
    { key: 'In Progress', weight: 15 },
    { key: 'In Review', weight: 10 },
    { key: 'Draft', weight: 10 },
    { key: 'Not Started', weight: 10 },
    { key: 'QA', weight: 5 },
    { key: 'Reject', weight: 5 },
  ];

  const getStatusByWeight = () => {
    const totalWeight = statusWeights.reduce((acc, w) => acc + w.weight, 0);
    let r = Math.random() * totalWeight;
    for (const sw of statusWeights) {
      if (r < sw.weight) {
        return statuses.find(s => s.notionKey === sw.key);
      }
      r -= sw.weight;
    }
    return statuses.find(s => s.notionKey === 'Aproved');
  };

  const doctypeWeights = [
    { key: 'Regular-Presentation', weight: 70 },
    { key: 'Infographic-Slides', weight: 50 },
    { key: 'Regular-Sosmed', weight: 45 },
    { key: 'Infographic-Graph', weight: 20 },
    { key: 'Infographic-Flyer', weight: 15 },
    { key: 'Infographic-Sosmed', weight: 15 },
    { key: 'Flow-Process-Infographic', weight: 12 },
    { key: 'Graph-Freeboard', weight: 10 },
    { key: 'Graph', weight: 10 },
    { key: 'CV-Resume', weight: 8 },
    { key: 'Notes/Meeting-Minutes', weight: 8 },
    { key: 'Newsletter', weight: 8 },
    { key: 'Spesification-Sheets', weight: 5 },
    { key: 'Magazine', weight: 5 },
    { key: 'Banner-Ads', weight: 5 },
    { key: 'calendar', weight: 5 },
    { key: 'Flyer', weight: 5 },
  ];

  const getDoctypeByWeight = () => {
    const totalWeight = doctypeWeights.reduce((acc, w) => acc + w.weight, 0);
    let r = Math.random() * totalWeight;
    for (const dw of doctypeWeights) {
      if (r < dw.weight) {
        return doctypes.find(dt => dt.notionKey === dw.key);
      }
      r -= dw.weight;
    }
    return doctypes[0];
  };

  const projectNames = [
    'Presentation Deck Redesign', 'Pitch Deck Template', 'Company Profile PPT',
    'Instagram Post Carousel', 'Summer Sale Story', 'Product Launch Flyer',
    'Monthly Marketing Newsletter', 'Annual Business Calendar', 'QA Meeting Notes Template',
    'Technical Specs Sheet', 'Standard Operating Guidelines Doc', 'Infographic Data Visualizer',
    'Recruiting Resume Layout', 'Facebook Banner Ad', 'Conference Presentation Slides',
    'Brand Identity Deck', 'Website Hero Header Banner', 'Hiring Poster template'
  ];

  // Helper to generate a random date in the range
  const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

  const tasks = [];
  for (let i = 0; i < totalTasksCount; i++) {
    const designer = designers[Math.floor(Math.random() * designers.length)];
    const doctype = getDoctypeByWeight();
    const status = getStatusByWeight();
    const isApproved = status.countsAsApproved;
    const isProfileOnly = status.countsAsProfileOnly;

    // Distribute task creation dates across Feb 1 to Jul 31, 2026
    const createdTime = randomDate(new Date(2026, 1, 1), new Date(2026, 6, 31));
    const pages = Math.floor(Math.random() * 12) + 2; // 2-14 pages
    const qtySubmit = Math.floor(Math.random() * 6) + 1; // 1-6 template qty

    const isPro = Math.random() < 0.75;
    const license = isPro ? 'Pro' : 'Free';

    let languages = ['IND'];
    const langRand = Math.random();
    if (langRand < 0.4) {
      languages = ['ENG'];
    } else if (langRand < 0.6) {
      languages = ['IND', 'ENG'];
    }

    const priorityRand = Math.random();
    const priority = priorityRand < 0.2 ? 'High' : (priorityRand < 0.6 ? 'Medium' : 'Low');

    const dateApproved = (isApproved || isProfileOnly)
      ? new Date(createdTime.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000) // 1-4 days later
      : null;

    // Month strings for payroll/reporting
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const taskMonth = `${monthNames[createdTime.getMonth()]}-${createdTime.getFullYear()}`;
    // Simulate manual assignment of payroll month for approved tasks
    // Some are paid in the task month, some are delayed to the next month
    const isDelayed = Math.random() > 0.7;
    let pMonthDate = new Date(createdTime);
    if (isDelayed) {
      pMonthDate.setMonth(pMonthDate.getMonth() + 1);
    }
    const payrollMonth = status.countsAsApproved 
      ? `${monthNames[pMonthDate.getMonth()]}-${pMonthDate.getFullYear()}`
      : null;

    const taskName = `${doctype.displayName} - ${projectNames[Math.floor(Math.random() * projectNames.length)]} #${1000 + i}`;

    const task = await prisma.task.create({
      data: {
        notionPageId: `notion_page_${i}_${Math.random().toString(36).substring(2, 7)}`,
        notionUrl: `https://notion.so/workspace/database/${i}`,
        name: taskName,
        designerId: designer.id,
        doctypeId: doctype.id,
        designStatusId: status.id,
        pages: pages,
        qtySubmit: qtySubmit,
        license: license,
        languages: languages,
        dateApproved: dateApproved,
        taskMonth: taskMonth,
        payrollMonth: payrollMonth,
        priority: priority,
        createdTime: createdTime,
      },
    });

    // Tag accounts (brands). Randomly select 1 or 2 brands
    const numBrands = Math.random() < 0.9 ? 1 : 2;
    const shuffledAccounts = [...accounts].sort(() => 0.5 - Math.random());
    for (let j = 0; j < numBrands; j++) {
      await prisma.taskAccount.create({
        data: {
          taskId: task.id,
          accountId: shuffledAccounts[j].id,
        },
      });
    }

    tasks.push(task);
  }

  // Create some sync logs
  console.log('Seeding sync logs...');
  const now = new Date();
  const syncLogsData = [
    { startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), finishedAt: new Date(now.getTime() - (2 * 60 - 2) * 60 * 1000), status: 'success', recordsSynced: 12 },
    { startedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), finishedAt: new Date(now.getTime() - (1 * 60 - 3) * 60 * 1000), status: 'success', recordsSynced: 8 },
    { startedAt: new Date(now.getTime() - 15 * 60 * 1000), finishedAt: new Date(now.getTime() - 13 * 60 * 1000), status: 'success', recordsSynced: 14 },
  ];

  for (const log of syncLogsData) {
    await prisma.syncLog.create({
      data: log,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
