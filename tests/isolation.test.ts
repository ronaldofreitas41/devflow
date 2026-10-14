import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { NotFoundError } from "@/server/errors";
import * as focus from "@/server/services/focus";
import * as projects from "@/server/services/projects";
import { getReport } from "@/server/services/reports";
import * as tasks from "@/server/services/tasks";
import { createUser, projectInput, resetDb, taskInput } from "@/test/factories";
import { taskFiltersSchema } from "@/server/validators/task";

/**
 * Isolamento: o usuário B nunca consegue ler, alterar, mover, excluir ou se vincular
 * aos registros do usuário A — e as tentativas não deixam efeito colateral.
 */
describe("isolamento entre usuários", () => {
  let alice: string;
  let bob: string;
  let aliceProject: string;
  let aliceTask: string;

  beforeEach(async () => {
    await resetDb();
    alice = (await createUser("Alice")).id;
    bob = (await createUser("Bob")).id;
    aliceProject = (await projects.createProject(alice, projectInput({ name: "Segredo da Alice" }))).id;
    aliceTask = (await tasks.createTask(alice, taskInput({ title: "Tarefa da Alice", projectId: aliceProject }))).id;
  });

  it("listagens retornam apenas os próprios registros", async () => {
    expect(await projects.listProjects(bob, { q: "", status: "ALL" })).toHaveLength(0);
    const all = taskFiltersSchema.parse({});
    expect((await tasks.listTasks(bob, all)).total).toBe(0);
    const board = await tasks.listBoard(bob, all);
    expect(board.TODO).toHaveLength(0);
    expect(await projects.listProjectOptions(bob)).toHaveLength(0);
  });

  it("leitura direta por ID de outro usuário falha como 'não encontrado'", async () => {
    await expect(projects.getProject(bob, aliceProject)).rejects.toBeInstanceOf(NotFoundError);
    await expect(tasks.getTask(bob, aliceTask)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("não permite editar ou excluir registros alheios", async () => {
    await expect(projects.updateProject(bob, aliceProject, projectInput({ name: "Hackeado" }))).rejects.toBeInstanceOf(NotFoundError);
    await expect(projects.deleteProject(bob, aliceProject)).rejects.toBeInstanceOf(NotFoundError);
    await expect(tasks.updateTask(bob, aliceTask, taskInput({ title: "Hackeado" }))).rejects.toBeInstanceOf(NotFoundError);
    await expect(tasks.setTaskStatus(bob, aliceTask, "DONE")).rejects.toBeInstanceOf(NotFoundError);
    await expect(tasks.deleteTask(bob, aliceTask)).rejects.toBeInstanceOf(NotFoundError);

    const p = await db.project.findUniqueOrThrow({ where: { id: aliceProject } });
    const t = await db.task.findUniqueOrThrow({ where: { id: aliceTask } });
    expect(p.name).toBe("Segredo da Alice");
    expect(t.title).toBe("Tarefa da Alice");
    expect(t.status).toBe("TODO");
  });

  it("não permite mover no Kanban tarefas alheias, nem misturadas às próprias", async () => {
    const bobTask = (await tasks.createTask(bob, taskInput({ title: "Do Bob" }))).id;
    await expect(tasks.moveTask(bob, aliceTask, "DONE", [aliceTask])).rejects.toBeInstanceOf(NotFoundError);
    await expect(tasks.moveTask(bob, bobTask, "DONE", [bobTask, aliceTask])).rejects.toBeInstanceOf(NotFoundError);
    expect((await db.task.findUniqueOrThrow({ where: { id: aliceTask } })).status).toBe("TODO");
    expect((await db.task.findUniqueOrThrow({ where: { id: bobTask } })).status).toBe("TODO");
  });

  it("não permite vincular tarefa ou sessão de foco a projeto/tarefa alheios", async () => {
    await expect(tasks.createTask(bob, taskInput({ projectId: aliceProject }))).rejects.toBeInstanceOf(NotFoundError);
    await expect(focus.startSession(bob, { plannedMinutes: 25, projectId: aliceProject, taskId: "" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(focus.startSession(bob, { plannedMinutes: 25, projectId: "", taskId: aliceTask })).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.task.count({ where: { userId: bob } })).toBe(0);
    expect(await db.focusSession.count({ where: { userId: bob } })).toBe(0);
  });

  it("não permite controlar a sessão de foco de outro usuário", async () => {
    const s = await focus.startSession(alice, { plannedMinutes: 25, projectId: "", taskId: "" });
    expect(await focus.getActiveSession(bob)).toBeNull();
    await expect(focus.pauseSession(bob, s.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(focus.finishSession(bob, s.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(focus.cancelSession(bob, s.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await db.focusSession.findUniqueOrThrow({ where: { id: s.id } })).status).toBe("RUNNING");
  });

  it("relatórios não incluem dados alheios nem aceitam projeto alheio como filtro", async () => {
    await tasks.setTaskStatus(alice, aliceTask, "DONE");
    const today = new Date().toISOString().slice(0, 10);
    const range = { from: "2026-01-01", to: today > "2026-01-01" ? today : "2026-01-01" };
    const bobReport = await getReport(bob, range, null);
    expect(bobReport.totals.completed).toBe(0);
    expect(bobReport.topProjects).toHaveLength(0);
    await expect(getReport(bob, range, aliceProject)).rejects.toBeInstanceOf(NotFoundError);
  });
});
