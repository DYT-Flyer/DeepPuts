import prisma from "./src/lib/prisma";

async function test() {
  const upper = "AAPL";
  const analyses = await prisma.analysis.findMany({
    where: {
      affectedTickers: { contains: upper },
    },
    include: { 
      canonicalEvent: { include: { rawEvents: { take: 1, select: { rawJson: true } } } }, 
      _count: { select: { comments: true } }, 
      votes: true 
    },
    orderBy: [{ canonicalEvent: { firstSeenAt: "desc" } }, { convictionScore: "desc" }],
    take: 50,
  });
  
  analyses.map(a => {
    console.log(a.votes);
    console.log(a.canonicalEvent.rawEvents);
  });
}
