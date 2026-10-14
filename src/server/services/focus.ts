import { db } from "@/lib/db";
import { addDays, dayKey, eachDay, formatDayShort, rangeBounds, type DateRange } from "@/lib/dates";
import { finalDurationSeconds } from "@/lib/focus";
import { AppError, NotFoundError } from "@/server/errors";
import type { StartFocusInput } from "@/server/validators/focus";
import { logActivity } from "./activity";
import { assertProjectOwned } from "./projects";

const activeSelect = {
  id: true,
  plannedMinutes: true,
  status: true,
  startedAt: true,
  pausedAt: true,
  totalPausedMs: true,
  project: { select: { id: true, name: true, color: true } },
  task: { select: { id: true, title: true } },
} as const;

export async function getActiveSession(userId: string) {
  return db.focusSession.findFirst({
    where: { userId, status: { in: ["RUNNING", "PAUSED"] } },
    orderBy: { startedAt: "desc" },
    select: activeSelect,
  });
}

export type ActiveFocusSession = NonNullable<Awaited<ReturnType<typeof getActiveSession>>>;

async function requireActive(userId: string, id: string) {
  const s = await db.focusSession.findFirst({
    where: { id, userId, status: { in: ["RUNNING", "PAUSED"] } },
  });
  if (!s) throw new NotFoundError("Sessão ativa");
  return s;
}

export async function startSession(userId: string, input: StartFocusInput, now = new Date()) {
  const running = await getActiveSession(userId);
  if (running) throw new AppError("Já existe uma sessão em andamento.", "CONFLICT");

  let projectId = input.projectId || null;
  const taskId = input.taskId || null;
  if (taskId) {
    const task = await db.task.findFirst({ where: { id: taskId, userId }, select: { projectId: true } });
    if (!task) throw new NotFoundError("Tarefa");
    // A tarefa determina o projeto, garantindo consistência do vínculo.
    projectId = task.projectId ?? projectId;
  }
  if (projectId) await assertProjectOwned(userId, projectId);

  return db.focusSession.create({
    data: { userId, projectId, taskId, plannedMinutes: input.plannedMinutes, startedAt: now, status: "RUNNING" },
    select: activeSelect,
  });
}

export async function pauseSession(userId: string, id: string, now = new Date()) {
  const s = await requireActive(userId, id);
  if (s.status === "PAUSED") return;
  await db.focusSession.updateMany({ where: { id, userId, status: "RUNNING" }, data: { status: "PAUSED", pausedAt: now } });
}

export async function resumeSession(userId: string, id: string, now = new Date()) {
  const s = await requireActive(userId, id);
  if (s.status !== "PAUSED" || !s.pausedAt) return;
  const pausedFor = Math.max(0, now.getTime() - s.pausedAt.getTime());
  await db.focusSession.updateMany({
    where: { id, userId, status: "PAUSED" },
    data: { status: "RUNNING", pausedAt: null, totalPausedMs: s.totalPausedMs + pausedFor },
  });
}

/** Finaliza calculando a duração real a partir dos timestamps, limitada ao planejado. */
export async function finishSession(userId: string, id: string, now = new Date()) {
  const s = await requireActive(userId, id);
  const durationSeconds = finalDurationSeconds(s, s.plannedMinutes, now);
  await db.focusSession.updateMany({
    where: { id, userId },
    data: { status: "COMPLETED", endedAt: now, durationSeconds },
  });
  await logActivity(userId, "FOCUS_COMPLETED", `${Math.round(durationSeconds / 60)} min de foco`);
  return { durationSeconds };
}

export async function cancelSession(userId: string, id: string, now = new Date()) {
  await requireActive(userId, id);
  await db.focusSession.updateMany({ where: { id, userId }, data: { status: "CANCELLED", endedAt: now, durationSeconds: 0 } });
}

export async function listSessionHistory(userId: string, take = 15) {
  return db.focusSession.findMany({
    where: { userId, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      startedAt: true,
      durationSeconds: true,
      plannedMinutes: true,
      project: { select: { name: true, color: true } },
      task: { select: { title: true } },
    },
  });
}

/** Minutos de foco por dia dentro do período. */
export async function focusByDay(userId: string, range: DateRange) {
  const { start, end } = rangeBounds(range);
  const sessions = await db.focusSession.findMany({
    where: { userId, status: "COMPLETED", startedAt: { gte: start, lt: end } },
    select: { startedAt: true, durationSeconds: true },
  });
  const map = new Map(eachDay(range).map((d) => [d, 0]));
  let totalSeconds = 0;
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    const sec = s.durationSeconds ?? 0;
    totalSeconds += sec;
    map.set(k, (map.get(k) ?? 0) + sec);
  }
  return {
    totalSeconds,
    count: sessions.length,
    days: [...map.entries()].map(([day, sec]) => ({ day, label: formatDayShort(day), minutes: Math.round(sec / 60) })),
  };
}

export function lastNDays(today: string, n: number): DateRange {
  return { from: addDays(today, -(n - 1)), to: today };
}
