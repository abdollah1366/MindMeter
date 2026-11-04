import { PrismaClient } from "@prisma/client";

// یک نمونه‌ی Prisma در کل برنامه (جلوگیری از ساخت چندباره در حالت توسعه)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
