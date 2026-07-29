import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Cap the connection pool so Next.js + scheduler don't exhaust pg max_connections.
// Override by setting connection_limit in DATABASE_URL directly.
function buildUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.includes("connection_limit")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=10`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
