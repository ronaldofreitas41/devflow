import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  APP_TIMEZONE,
  dayKey,
  eachDay,
  formatDayShort,
  percentChange,
  previousRange,
  rangeBounds,
  type DateRange,
  type DayKey,
} from "@/lib/dates";
import { TASK_PRIORITY } from "@/lib/constants";

/**
 * Cálculo puro dos indicadores — sem acesso a banco, para ser testável e
 * reutilizado igualmente pelo dashboard, pela tela de relatórios e pelo PDF.
 *
 * Definições (documentadas também na interface):
 *  - Concluídas: tarefas com `completedAt` dentro do período.
 *  - Pendentes: tarefas criadas até o fim do período e ainda abertas nesse momento.
 *  - Atrasadas: pendentes cujo prazo já tinha vencido nesse momento.
 *  - Horas focadas: soma das sessões de foco concluídas iniciadas no período.
 * "Fim do período" é o menor entre o fim do último dia e o instante atual.
 */

export interface CalcTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  createdAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
}

export interface CalcSession {
  startedAt: Date;
  durationSeconds: number;
  projectId: string | null;
}

export interface CalcProject {
  id: string;
  name: string;
  color: string;
}

export interface PeriodTotals {
  completed: number;
  pending: number;
  overdue: number;
  focusSeconds: number;
  sessions: number;
  completionRate: number; // 0..100
}

export interface ReportData {
  range: DateRange;
  previousRange: DateRange;
  generatedAt: string;
  timezone: string;
  totals: PeriodTotals;
  previous: PeriodTotals;
  change: Record<"completed" | "pending" | "overdue" | "focusSeconds", number | null>;
  daily: { day: DayKey; label: string; completed: number; focusMinutes: number }[];
  priority: { priority: TaskPriority; completed: number; pending: number }[];
  topProjects: { id: string; name: string; color: string; completed: number; focusSeconds: number }[];
  overdueTasks: { id: string; title: string; priority: TaskPriority; dueDay: DayKey }[];
}

interface Window {
  start: number;
  end: number;
  asOf: number;
}

function windowFor(range: DateRange, now: Date, tz: string): Window {
  const { start, end } = rangeBounds(range, tz);
  return { start: start.getTime(), end: end.getTime(), asOf: Math.min(end.getTime(), now.getTime()) };
}

// Limitado por `asOf`: num período em andamento, nada "acontece" depois de agora.
const inWindow = (d: Date | null, w: Window) => d !== null && d.getTime() >= w.start && d.getTime() < w.asOf;

function isPendingAt(t: CalcTask, asOf: number) {
  return t.createdAt.getTime() < asOf && (t.completedAt === null || t.completedAt.getTime() >= asOf);
}

function isOverdueAt(t: CalcTask, asOf: number) {
  return isPendingAt(t, asOf) && t.dueDate !== null && t.dueDate.getTime() < asOf;
}

export function computeTotals(tasks: CalcTask[], sessions: CalcSession[], w: Window): PeriodTotals {
  let completed = 0;
  let pending = 0;
  let overdue = 0;
  for (const t of tasks) {
    if (inWindow(t.completedAt, w)) completed++;
    if (isPendingAt(t, w.asOf)) {
      pending++;
      if (isOverdueAt(t, w.asOf)) overdue++;
    }
  }
  let focusSeconds = 0;
  let count = 0;
  for (const s of sessions) {
    if (inWindow(s.startedAt, w)) {
      focusSeconds += s.durationSeconds;
      count++;
    }
  }
  const base = completed + pending;
  return {
    completed,
    pending,
    overdue,
    focusSeconds,
    sessions: count,
    completionRate: base === 0 ? 0 : Math.round((completed / base) * 1000) / 10,
  };
}

export function computeReport(input: {
  range: DateRange;
  tasks: CalcTask[];
  sessions: CalcSession[];
  projects: CalcProject[];
  now?: Date;
  tz?: string;
}): ReportData {
  const now = input.now ?? new Date();
  const tz = input.tz ?? APP_TIMEZONE;
  const prevRange = previousRange(input.range);
  const cur = windowFor(input.range, now, tz);
  const prev = windowFor(prevRange, now, tz);

  const totals = computeTotals(input.tasks, input.sessions, cur);
  const previous = computeTotals(input.tasks, input.sessions, prev);

  // Série diária
  const days = eachDay(input.range);
  const byDay = new Map(days.map((d) => [d, { completed: 0, focusSeconds: 0 }]));
  for (const t of input.tasks) {
    if (inWindow(t.completedAt, cur)) {
      const b = byDay.get(dayKey(t.completedAt!, tz));
      if (b) b.completed++;
    }
  }
  for (const s of input.sessions) {
    if (inWindow(s.startedAt, cur)) {
      const b = byDay.get(dayKey(s.startedAt, tz));
      if (b) b.focusSeconds += s.durationSeconds;
    }
  }
  const daily = days.map((day) => {
    const b = byDay.get(day)!;
    return { day, label: formatDayShort(day), completed: b.completed, focusMinutes: Math.round(b.focusSeconds / 60) };
  });

  // Distribuição por prioridade (tarefas concluídas no período + pendentes ao fim dele)
  const priority = TASK_PRIORITY.map((p) => ({ priority: p, completed: 0, pending: 0 }));
  const pIndex = new Map(priority.map((p) => [p.priority, p]));
  for (const t of input.tasks) {
    const bucket = pIndex.get(t.priority)!;
    if (inWindow(t.completedAt, cur)) bucket.completed++;
    else if (isPendingAt(t, cur.asOf)) bucket.pending++;
  }

  // Projetos mais ativos
  const projectStats = new Map(
    input.projects.map((p) => [p.id, { id: p.id, name: p.name, color: p.color, completed: 0, focusSeconds: 0 }]),
  );
  for (const t of input.tasks) {
    if (t.projectId && inWindow(t.completedAt, cur)) {
      const s = projectStats.get(t.projectId);
      if (s) s.completed++;
    }
  }
  for (const s of input.sessions) {
    if (s.projectId && inWindow(s.startedAt, cur)) {
      const p = projectStats.get(s.projectId);
      if (p) p.focusSeconds += s.durationSeconds;
    }
  }
  const topProjects = [...projectStats.values()]
    .filter((p) => p.completed > 0 || p.focusSeconds > 0)
    .sort((a, b) => b.focusSeconds - a.focusSeconds || b.completed - a.completed || a.name.localeCompare(b.name))
    .slice(0, 5);

  const overdueTasks = input.tasks
    .filter((t) => isOverdueAt(t, cur.asOf))
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 10)
    .map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueDay: dayKey(t.dueDate!, tz) }));

  return {
    range: input.range,
    previousRange: prevRange,
    generatedAt: now.toISOString(),
    timezone: tz,
    totals,
    previous,
    change: {
      completed: percentChange(totals.completed, previous.completed),
      pending: percentChange(totals.pending, previous.pending),
      overdue: percentChange(totals.overdue, previous.overdue),
      focusSeconds: percentChange(totals.focusSeconds, previous.focusSeconds),
    },
    daily,
    priority,
    topProjects,
    overdueTasks,
  };
}
