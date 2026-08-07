import prisma from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      passwordHash: '$2b$10$EpjX0VO2yz5A5g5JZmG9xeG7aC1lA7Ue2uF3p1.mOQ1x/Q5l/61Ky', // 'password'
    },
    create: {
      email: 'test@example.com',
      passwordHash: '$2b$10$EpjX0VO2yz5A5g5JZmG9xeG7aC1lA7Ue2uF3p1.mOQ1x/Q5l/61Ky', // 'password'
      name: 'Test User',
      role: 'admin'
    },
  });

  const doctype = await prisma.doctype.upsert({
    where: { notionKey: 'dummy_doctype' },
    update: {},
    create: {
      notionKey: 'dummy_doctype',
      displayName: 'Test Doctype',
      pages: 1,
    },
  });

  const status = await prisma.designStatus.upsert({
    where: { notionKey: 'Aproved' },
    update: {},
    create: {
      notionKey: 'Aproved',
      displayName: 'Aproved',
      statusGroup: 'complete',
      countsAsSubmitted: true,
      countsAsApproved: true,
      countsAsProfileOnly: false,
    },
  });

  console.log('Seed successful:', { user, doctype, status });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
