import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany();
  if (users) {
    console.log('✅ Connected');
  } else {
    throw new Error('Failed to connect and read users');
  }
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
