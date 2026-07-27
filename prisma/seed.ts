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

  const designer = await prisma.designer.upsert({
    where: { notionKey: 'dummy_designer' },
    update: {},
    create: {
      notionKey: 'dummy_designer',
      displayName: 'Test Designer',
      status: 'Active'
    },
  });

  console.log('Seed successful:', { user, designer });
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
