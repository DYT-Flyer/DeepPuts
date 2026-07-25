import prisma from "./src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { comments: true, votes: true }
      }
    },
    take: 5
  });
  console.log(users);
}
main();
