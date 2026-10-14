import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import * as focus from "@/server/services/focus";
import * as projects from "@/server/services/projects";
import * as tasks from "@/server/services/tasks";
import { projectInputSchema } from "@/server/validators/project";
import { taskFiltersSchema, taskInputSchema } from "@/server/validators/task";
import { startFocusSchema } from "@/server/validators/focus";
import { createUser, projectInput, resetDb, taskInput } from "@/test/factories";

let user: string;
beforeEach(async () => {
  await resetDb();
  user = (await createUser()).id;
});

describe("validação de entrada (Zod)", () => {
  it("rejeita entradas inválidas", () => {
    expect(projectInputSchema.safeParse(projectInput({ name: "  " })).success).toBe(false);
    expect(projectInputSchema.safeParse(projectInput({ color: "red" })).success).toBe(false);
    expect(projectInputSchema.safeParse(projectInput({ startDate: "2026-10-10", dueDate: "2026-10-01" })).success).toBe(false);
    expect(taskInputSchema.safeParse(taskInput({ priority: "ALTISSIMA" })).success).toBe(false);
    expect(taskInputSchema.safeParse(taskInput({ dueDate: "2026-02-30" })).success).toBe(false);
    expect(startFocusSchema.safeParse({ plannedMinutes: 0, projectId: "", taskId: "" }).success).toBe(false);
    expect(startFocusSchema.safeParse({ plannedMinutes: 500, projectId: "", taskId: "" }).success).toBe(false);
  });

  it("filtros da URL inválidos caem em valores seguros", () => {
    const f = taskFiltersSchema.parse({ page: "-3", sort: "drop table", status: "xyz" });
    expect(f).toMatchObject({ page: 1, sort: "createdAt", status: "ALL" });
  });
});

describe("CRUD de projetos", () => {
  it("cria, lista com progresso, edita e exclui preservando tarefas", async () => {
    const p = await projects.createProject(user, projectInput({ name: "Site", dueDate: "2026-12-31" }));
    expect(dayKey(p.dueDate!)).toBe("2026-12-31");

    const t1 = await tasks.createTask(user, taskInput({ projectId: p.id }));
    await tasks.createTask(user, taskInput({ projectId: p.id, status: "DONE" }));
    await tasks.createTask(user, taskInput({ projectId: p.id }));
    await tasks.setTaskStatus(user, t1.id, "DONE");

    const [listed] = await projects.listProjects(user, { q: "", status: "ALL" });
    expect(listed).toMatchObject({ taskCount: 3, doneCount: 2, progress: 67 });

    await projects.updateProject(user, p.id, projectInput({ name: "Site novo", status: "PAUSED" }));
    expect((await projects.getProject(user, p.id)).status).toBe("PAUSED");
    expect(await projects.listProjects(user, { q: "novo", status: "PAUSED" })).toHaveLength(1);
    expect(await projects.listProjects(user, { q: "inexistente", status: "ALL" })).toHaveLength(0);

    await projects.deleteProject(user, p.id);
    expect(await db.project.count()).toBe(0);
    expect(await db.task.count({ where: { userId: user, projectId: null } })).toBe(3);
  });
});

describe("CRUD de tarefas", () => {
  it("controla completedAt conforme o status", async () => {
    const t = await tasks.createTask(user, taskInput());
    expect(t.completedAt).toBeNull();
    await tasks.setTaskStatus(user, t.id, "DONE");
    const done = await tasks.getTask(user, t.id);
    expect(done.completedAt).not.toBeNull();
    // editar uma tarefa já concluída mantém a data original de conclusão
    await tasks.updateTask(user, t.id, taskInput({ title: "Renomeada", status: "DONE" }));
    expect((await tasks.getTask(user, t.id)).completedAt).toEqual(done.completedAt);
    await tasks.setTaskStatus(user, t.id, "IN_PROGRESS");
    expect((await tasks.getTask(user, t.id)).completedAt).toBeNull();
  });

  it("filtra, ordena e pagina no servidor", async () => {
    for (let i = 1; i <= 23; i++) {
      await tasks.createTask(user, taskInput({ title: `Item ${String(i).padStart(2, "0")}`, priority: i % 5 === 0 ? "URGENT" : "LOW" }));
    }
    const base = taskFiltersSchema.parse({});
    const p1 = await tasks.listTasks(user, { ...base, sort: "title", order: "asc" });
    expect(p1).toMatchObject({ total: 23, pageCount: 3, page: 1 });
    expect(p1.items).toHaveLength(10);
    expect(p1.items[0]!.title).toBe("Item 01");
    const p3 = await tasks.listTasks(user, { ...base, sort: "title", order: "asc", page: 3 });
    expect(p3.items.map((t) => t.title)).toEqual(["Item 21", "Item 22", "Item 23"]);
    // página fora do intervalo é ajustada
    expect((await tasks.listTasks(user, { ...base, page: 99 })).page).toBe(3);

    const urgent = await tasks.listTasks(user, { ...base, priority: "URGENT" });
    expect(urgent.total).toBe(4);
    const search = await tasks.listTasks(user, { ...base, q: "item 1" });
    expect(search.total).toBe(10); // Item 10..19
    const byPriority = await tasks.listTasks(user, { ...base, sort: "priority", order: "desc" });
    expect(byPriority.items[0]!.priority).toBe("URGENT");
  });

  it("persiste a ordem do Kanban e a mudança de coluna", async () => {
    const a = await tasks.createTask(user, taskInput({ title: "A" }));
    const b = await tasks.createTask(user, taskInput({ title: "B", status: "IN_PROGRESS" }));
    const c = await tasks.createTask(user, taskInput({ title: "C", status: "IN_PROGRESS" }));
    await tasks.moveTask(user, a.id, "IN_PROGRESS", [b.id, a.id, c.id]);
    const board = await tasks.listBoard(user, taskFiltersSchema.parse({}));
    expect(board.TODO).toHaveLength(0);
    expect(board.IN_PROGRESS.map((t) => t.title)).toEqual(["B", "A", "C"]);
    await tasks.moveTask(user, a.id, "DONE", [a.id]);
    expect((await tasks.getTask(user, a.id)).completedAt).not.toBeNull();
  });

  it("registra atividades", async () => {
    const t = await tasks.createTask(user, taskInput({ title: "Log" }));
    await tasks.setTaskStatus(user, t.id, "DONE");
    await tasks.deleteTask(user, t.id);
    const types = (await db.activity.findMany({ where: { userId: user }, orderBy: { createdAt: "asc" } })).map((a) => a.type);
    expect(types).toEqual(["TASK_CREATED", "TASK_COMPLETED", "TASK_DELETED"]);
  });
});

describe("sessões de foco", () => {
  it("inicia, pausa, retoma e finaliza com duração baseada em timestamps", async () => {
    const t0 = new Date("2026-10-14T12:00:00Z");
    const plus = (m: number) => new Date(t0.getTime() + m * 60_000);
    const p = await projects.createProject(user, projectInput());
    const task = await tasks.createTask(user, taskInput({ projectId: p.id }));

    const s = await focus.startSession(user, { plannedMinutes: 25, projectId: "", taskId: task.id }, t0);
    expect(s.project?.id).toBe(p.id); // projeto herdado da tarefa
    await expect(focus.startSession(user, { plannedMinutes: 25, projectId: "", taskId: "" })).rejects.toThrow("Já existe");

    await focus.pauseSession(user, s.id, plus(10));
    await focus.resumeSession(user, s.id, plus(15)); // 5 min pausada
    const { durationSeconds } = await focus.finishSession(user, s.id, plus(20));
    expect(durationSeconds).toBe(15 * 60);
    expect(await focus.getActiveSession(user)).toBeNull();
  });

  it("limita a duração ao planejado quando finalizada tarde", async () => {
    const t0 = new Date("2026-10-14T12:00:00Z");
    const s = await focus.startSession(user, { plannedMinutes: 25, projectId: "", taskId: "" }, t0);
    const r = await focus.finishSession(user, s.id, new Date(t0.getTime() + 3 * 3_600_000));
    expect(r.durationSeconds).toBe(25 * 60);
  });

  it("sessão cancelada não entra no histórico", async () => {
    const s = await focus.startSession(user, { plannedMinutes: 25, projectId: "", taskId: "" });
    await focus.cancelSession(user, s.id);
    expect(await focus.listSessionHistory(user)).toHaveLength(0);
  });
});
