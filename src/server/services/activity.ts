import type { ActivityType } from "@prisma/client";
import { db } from "@/lib/db";

export async function logActivity(userId: string, type: ActivityType, label: string) {
  await db.activity.create({ data: { userId, type, label: label.slice(0, 160) } });
}

export async function listRecentActivity(userId: string, take = 8) {
  return db.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, label: true, createdAt: true },
  });
}
