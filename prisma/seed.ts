import prisma from '../src/lib/prisma';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: 'dummy_hash',
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
      isActive: true
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
