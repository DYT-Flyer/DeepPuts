const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (users.length > 0) {
    const admin = users[0];
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'admin' }
    });
    console.log(`Promoted ${admin.email} to admin!`);
  } else {
    console.log('No users found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
