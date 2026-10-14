import { describe, expect, it } from "vitest";
import { startOfDay } from "@/lib/dates";
import { computeReport, type CalcSession, type CalcTask } from "@/server/services/report-calc";

const TZ = "America/Sao_Paulo";
const at = (day: string, hour = 12) => new Date(startOfDay(day, TZ).getTime() + hour * 3_600_000);

let n = 0;
function task(t: Partial<CalcTask>): CalcTask {
  n++;
  return {
    id: `t${n}`,
    title: `Tarefa ${n}`,
    status: "TODO",
    priority: "MEDIUM",
    projectId: null,
    createdAt: at("2026-09-01"),
    completedAt: null,
    dueDate: null,
    ...t,
  };
}

const projects = [
  { id: "p1", name: "Alpha", color: "#8b5cf6" },
  { id: "p2", name: "Beta", color: "#3b82f6" },
];

describe("computeReport", () => {
  // Período atual: 08–14/10 (7 dias). Anterior equivalente: 01–07/10.
  const range = { from: "2026-10-08", to: "2026-10-14" };
  const now = at("2026-10-20");

  const tasks: CalcTask[] = [
    task({ status: "DONE", completedAt: at("2026-10-09"), priority: "HIGH", projectId: "p1" }),
    task({ status: "DONE", completedAt: at("2026-10-14", 23), priority: "URGENT", projectId: "p1" }),
    task({ status: "DONE", completedAt: at("2026-10-03"), priority: "LOW" }), // período anterior
    task({ status: "DONE", completedAt: at("2026-10-16") }), // depois do período → pendente no fim dele
    task({ dueDate: at("2026-10-10", 23), priority: "URGENT" }), // atrasada
    task({ dueDate: at("2026-10-30", 23) }), // pendente no prazo
    task({ createdAt: at("2026-10-18") }), // criada depois do período → não conta
  ];
  const sessions: CalcSession[] = [
    { startedAt: at("2026-10-08", 10), durationSeconds: 1500, projectId: "p2" },
    { startedAt: at("2026-10-09", 10), durationSeconds: 3000, projectId: "p1" },
    { startedAt: at("2026-10-02", 10), durationSeconds: 1500, projectId: null }, // anterior
    // 01:00 UTC de 15/10 = 22:00 de 14/10 em SP → pertence ao período
    { startedAt: new Date("2026-10-15T01:00:00Z"), durationSeconds: 600, projectId: null },
  ];

  const r = computeReport({ range, tasks, sessions, projects, now, tz: TZ });

  it("conta concluídas, pendentes e atrasadas com as definições documentadas", () => {
    expect(r.totals.completed).toBe(2);
    expect(r.totals.pending).toBe(3); // concluída depois + atrasada + no prazo
    expect(r.totals.overdue).toBe(1);
    expect(r.totals.completionRate).toBe(40);
  });

  it("soma horas de foco respeitando o fuso", () => {
    expect(r.totals.focusSeconds).toBe(1500 + 3000 + 600);
    expect(r.totals.sessions).toBe(3);
  });

  it("compara com o período anterior equivalente", () => {
    expect(r.previousRange).toEqual({ from: "2026-10-01", to: "2026-10-07" });
    expect(r.previous.completed).toBe(1);
    expect(r.previous.focusSeconds).toBe(1500);
    expect(r.change.completed).toBe(100);
    expect(r.change.focusSeconds).toBe(240);
  });

  it("gera série diária completa, inclusive dias vazios", () => {
    expect(r.daily).toHaveLength(7);
    expect(r.daily.find((d) => d.day === "2026-10-09")).toMatchObject({ completed: 1, focusMinutes: 50 });
    expect(r.daily.find((d) => d.day === "2026-10-14")).toMatchObject({ completed: 1, focusMinutes: 10 });
    expect(r.daily.find((d) => d.day === "2026-10-11")).toMatchObject({ completed: 0, focusMinutes: 0 });
    // a série soma exatamente os totais
    expect(r.daily.reduce((a, d) => a + d.completed, 0)).toBe(r.totals.completed);
  });

  it("distribui por prioridade e ranqueia projetos", () => {
    const urgent = r.priority.find((p) => p.priority === "URGENT")!;
    expect(urgent).toMatchObject({ completed: 1, pending: 1 });
    expect(r.topProjects.map((p) => p.name)).toEqual(["Alpha", "Beta"]);
    expect(r.topProjects[0]).toMatchObject({ completed: 2, focusSeconds: 3000 });
    expect(r.overdueTasks).toHaveLength(1);
  });

  it("período em andamento usa o instante atual como referência", () => {
    const live = computeReport({ range, tasks, sessions, projects, now: at("2026-10-12"), tz: TZ });
    // às 12h de 12/10: só a primeira concluída já aconteceu
    expect(live.totals.completed).toBe(1);
    expect(live.totals.overdue).toBe(1);
  });
});
