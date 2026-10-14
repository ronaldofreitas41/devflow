import { db } from "@/lib/db";
import {
  addDays,
  dayKey,
  previousRange,
  rangeBounds,
  startOfDay,
  weekStart,
  type DateRange,
} from "@/lib/dates";
import { computeReport, type CalcSession, type CalcTask, type ReportData } from "./report-calc";
import { listRecentActivity } from "./activity";
import { assertProjectOwned } from "./projects";

/**
 * Carrega, em poucas consultas, o mínimo de dados para calcular os indicadores
 * de `ranges` (e seus períodos anteriores equivalentes).
 */
async function loadInputs(userId: string, ranges: DateRange[], projectId: string | null) {
  const allRanges = ranges.flatMap((r) => [r, previousRange(r)]);
  const earliest = new Date(Math.min(...allRanges.map((r) => rangeBounds(r).start.getTime())));
  const latest = new Date(Math.max(...allRanges.map((r) => rangeBounds(r).end.getTime())));

  const projectFilter = projectId ? { projectId } : {};

  const [tasks, sessions, projects] = await Promise.all([
    db.task.findMany({
      where: {
        userId,
        ...projectFilter,
        createdAt: { lt: latest },
        OR: [{ completedAt: null }, { completedAt: { gte: earliest } }],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        createdAt: true,
        completedAt: true,
        dueDate: true,
      },
    }),
    db.focusSession.findMany({
      where: { userId, ...projectFilter, status: "COMPLETED", startedAt: { gte: earliest, lt: latest } },
      select: { startedAt: true, durationSeconds: true, projectId: true },
    }),
    db.project.findMany({
      where: { userId, ...(projectId ? { id: projectId } : {}) },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return {
    tasks: tasks as CalcTask[],
    sessions: sessions.map((s) => ({ ...s, durationSeconds: s.durationSeconds ?? 0 })) as CalcSession[],
    projects,
  };
}

export async function getReport(
  userId: string,
  range: DateRange,
  projectId: string | null,
  now = new Date(),
): Promise<ReportData> {
  if (projectId) await assertProjectOwned(userId, projectId);
  const inputs = await loadInputs(userId, [range], projectId);
  return computeReport({ range, ...inputs, now });
}

export async function getDashboard(userId: string, now = new Date()) {
  const today = dayKey(now);
  const thisWeek: DateRange = { from: weekStart(today), to: today };
  const last7: DateRange = { from: addDays(today, -6), to: today };

  const weeksBack = 8;
  const firstWeek = addDays(weekStart(today), -7 * (weeksBack - 1));

  const [inputs, activeProjects, openTasks, priorityTasks, recent, weeklySessions] = await Promise.all([
    loadInputs(userId, [thisWeek, last7], null),
    db.project.count({ where: { userId, status: "ACTIVE" } }),
    db.task.count({ where: { userId, status: { not: "DONE" } } }),
    db.task.findMany({
      where: { userId, status: { not: "DONE" } },
      orderBy: [{ priority: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: 5,
      include: { project: { select: { name: true, color: true } } },
    }),
    listRecentActivity(userId, 8),
    db.focusSession.findMany({
      where: { userId, status: "COMPLETED", startedAt: { gte: startOfDay(firstWeek) } },
      select: { startedAt: true, durationSeconds: true },
    }),
  ]);

  const week = computeReport({ range: thisWeek, ...inputs, now });
  const daily = computeReport({ range: last7, ...inputs, now }).daily;

  const weekly = Array.from({ length: weeksBack }, (_, i) => {
    const from = addDays(firstWeek, i * 7);
    return { week: from, label: from.slice(8, 10) + "/" + from.slice(5, 7), seconds: 0 };
  });
  for (const s of weeklySessions) {
    const w = weekly.find((x) => x.week === weekStart(dayKey(s.startedAt)));
    if (w) w.seconds += s.durationSeconds ?? 0;
  }

  return {
    activeProjects,
    openTasks,
    week,
    daily,
    weekly: weekly.map((w) => ({ label: w.label, hours: Math.round((w.seconds / 3600) * 10) / 10 })),
    priorityTasks,
    recent,
  };
}
