import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { endOfDay, startOfDay } from "@/lib/dates";
import { getDashboard, getReport } from "@/server/services/reports";
import { createUser, resetDb } from "@/test/factories";

const at = (day: string, hour = 12) => new Date(startOfDay(day).getTime() + hour * 3_600_000);

describe("relatórios a partir do banco", () => {
  let user: string;
  let p1: string;

  beforeEach(async () => {
    await resetDb();
    user = (await createUser()).id;
    p1 = (await db.project.create({ data: { userId: user, name: "Alpha" } })).id;
    const p2 = (await db.project.create({ data: { userId: user, name: "Beta" } })).id;
    await db.task.createMany({
      data: [
        { userId: user, projectId: p1, title: "a", status: "DONE", createdAt: at("2026-09-01"), completedAt: at("2026-10-09") },
        { userId: user, projectId: p2, title: "b", status: "DONE", createdAt: at("2026-09-01"), completedAt: at("2026-10-10") },
        { userId: user, projectId: p1, title: "c", status: "TODO", createdAt: at("2026-09-01"), dueDate: endOfDay("2026-10-11") },
        { userId: user, projectId: p1, title: "d", status: "DONE", createdAt: at("2026-09-01"), completedAt: at("2026-10-02") },
      ],
    });
    await db.focusSession.createMany({
      data: [
        { userId: user, projectId: p1, plannedMinutes: 25, status: "COMPLETED", startedAt: at("2026-10-09"), durationSeconds: 1500 },
        { userId: user, projectId: p2, plannedMinutes: 50, status: "COMPLETED", startedAt: at("2026-10-10"), durationSeconds: 3000 },
        // canceladas e em andamento não contam
        { userId: user, plannedMinutes: 25, status: "CANCELLED", startedAt: at("2026-10-10"), durationSeconds: 0 },
        { userId: user, plannedMinutes: 25, status: "RUNNING", startedAt: at("2026-10-10") },
      ],
    });
  });

  const range = { from: "2026-10-08", to: "2026-10-14" };
  const now = at("2026-10-20");

  it("calcula indicadores e comparação", async () => {
    const r = await getReport(user, range, null, now);
    expect(r.totals).toMatchObject({ completed: 2, pending: 1, overdue: 1, focusSeconds: 4500, sessions: 2 });
    expect(r.previous).toMatchObject({ completed: 1, focusSeconds: 0 });
    expect(r.change.completed).toBe(100);
    expect(r.change.focusSeconds).toBeNull();
  });

  it("filtra por projeto", async () => {
    const r = await getReport(user, range, p1, now);
    expect(r.totals).toMatchObject({ completed: 1, pending: 1, focusSeconds: 1500 });
    expect(r.topProjects.map((p) => p.name)).toEqual(["Alpha"]);
  });

  it("dashboard agrega a semana atual e as últimas 8 semanas", async () => {
    const d = await getDashboard(user, at("2026-10-14"));
    expect(d.activeProjects).toBe(2);
    expect(d.openTasks).toBe(1);
    expect(d.week.range).toEqual({ from: "2026-10-12", to: "2026-10-14" });
    expect(d.daily).toHaveLength(7);
    expect(d.weekly).toHaveLength(8);
    expect(d.weekly.at(-2)!.hours).toBe(1.3); // semana de 05/10: 4500 s
    expect(d.priorityTasks.map((t) => t.title)).toEqual(["c"]);
  });
});
