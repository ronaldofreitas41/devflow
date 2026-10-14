import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { endOfDay } from "@/lib/dates";
import { TASKS_PAGE_SIZE } from "@/lib/constants";
import { NotFoundError } from "@/server/errors";
import type { TaskFilters, TaskInput } from "@/server/validators/task";
import { logActivity } from "./activity";
import { assertProjectOwned } from "./projects";

const taskInclude = { project: { select: { id: true, name: true, color: true } } } satisfies Prisma.TaskInclude;

export type TaskWithProject = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function buildWhere(userId: string, f: Pick<TaskFilters, "q" | "status" | "priority" | "projectId">) {
  const where: Prisma.TaskWhereInput = { userId };
  if (f.status === "OPEN") where.status = { not: "DONE" };
  else if (f.status !== "ALL") where.status = f.status;
  if (f.priority !== "ALL") where.priority = f.priority;
  if (f.projectId === "NONE") where.projectId = null;
  else if (f.projectId !== "ALL" && f.projectId) where.projectId = f.projectId;
  if (f.q) {
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
    ];
  }
  return where;
}

function buildOrder(f: Pick<TaskFilters, "sort" | "order">): Prisma.TaskOrderByWithRelationInput[] {
  switch (f.sort) {
    case "dueDate":
      return [{ dueDate: { sort: f.order, nulls: "last" } }, { createdAt: "desc" }];
    case "priority":
      return [{ priority: f.order }, { createdAt: "desc" }];
    case "title":
      return [{ title: f.order }, { id: "asc" }];
    default:
      return [{ createdAt: f.order }, { id: "asc" }];
  }
}

/** Lista paginada no servidor. */
export async function listTasks(userId: string, f: TaskFilters) {
  const where = buildWhere(userId, f);
  const total = await db.task.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const items = await db.task.findMany({
    where,
    orderBy: buildOrder(f),
    include: taskInclude,
    skip: (page - 1) * TASKS_PAGE_SIZE,
    take: TASKS_PAGE_SIZE,
  });
  return { items, total, page, pageCount, pageSize: TASKS_PAGE_SIZE };
}

/** Quadro Kanban: mesmas buscas/filtros, agrupado por status e ordenado por posição. */
export async function listBoard(userId: string, f: TaskFilters) {
  const where = buildWhere(userId, { ...f, status: "ALL" });
  const items = await db.task.findMany({
    where,
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: taskInclude,
    take: 300,
  });
  return {
    TODO: items.filter((t) => t.status === "TODO"),
    IN_PROGRESS: items.filter((t) => t.status === "IN_PROGRESS"),
    DONE: items.filter((t) => t.status === "DONE"),
  } satisfies Record<TaskStatus, TaskWithProject[]>;
}

export async function listTaskOptions(userId: string) {
  return db.task.findMany({
    where: { userId, status: { not: "DONE" } },
    select: { id: true, title: true, projectId: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function getTask(userId: string, id: string) {
  const task = await db.task.findFirst({ where: { id, userId }, include: taskInclude });
  if (!task) throw new NotFoundError("Tarefa");
  return task;
}

async function topPosition(userId: string, status: TaskStatus) {
  const first = await db.task.findFirst({
    where: { userId, status },
    orderBy: { position: "asc" },
    select: { position: true },
  });
  return (first?.position ?? 1000) - 1000;
}

function completionFields(status: TaskStatus, previous?: { status: TaskStatus; completedAt: Date | null }) {
  if (status !== "DONE") return { completedAt: null };
  if (previous?.status === "DONE" && previous.completedAt) return { completedAt: previous.completedAt };
  return { completedAt: new Date() };
}

export async function createTask(userId: string, input: TaskInput) {
  if (input.projectId) await assertProjectOwned(userId, input.projectId);
  const task = await db.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description || null,
      projectId: input.projectId || null,
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate ? endOfDay(input.dueDate) : null,
      position: await topPosition(userId, input.status),
      ...completionFields(input.status),
    },
  });
  await logActivity(userId, input.status === "DONE" ? "TASK_COMPLETED" : "TASK_CREATED", task.title);
  return task;
}

export async function updateTask(userId: string, id: string, input: TaskInput) {
  const current = await db.task.findFirst({ where: { id, userId }, select: { status: true, completedAt: true } });
  if (!current) throw new NotFoundError("Tarefa");
  if (input.projectId) await assertProjectOwned(userId, input.projectId);

  const statusChanged = current.status !== input.status;
  await db.task.updateMany({
    where: { id, userId },
    data: {
      title: input.title,
      description: input.description || null,
      projectId: input.projectId || null,
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate ? endOfDay(input.dueDate) : null,
      ...(statusChanged ? { position: await topPosition(userId, input.status) } : {}),
      ...completionFields(input.status, current),
    },
  });
  const becameDone = statusChanged && input.status === "DONE";
  await logActivity(userId, becameDone ? "TASK_COMPLETED" : "TASK_UPDATED", input.title);
  return getTask(userId, id);
}

export async function setTaskStatus(userId: string, id: string, status: TaskStatus) {
  const current = await db.task.findFirst({ where: { id, userId }, select: { status: true, completedAt: true, title: true } });
  if (!current) throw new NotFoundError("Tarefa");
  if (current.status === status) return;
  await db.task.updateMany({
    where: { id, userId },
    data: { status, position: await topPosition(userId, status), ...completionFields(status, current) },
  });
  if (status === "DONE") await logActivity(userId, "TASK_COMPLETED", current.title);
}

/**
 * Persistência do drag-and-drop: recebe a ordem final da coluna de destino.
 * Todos os IDs precisam pertencer ao usuário, senão nada é alterado.
 */
export async function moveTask(userId: string, id: string, status: TaskStatus, orderedIds: string[]) {
  const ids = [...new Set(orderedIds.includes(id) ? orderedIds : [id, ...orderedIds])];
  const owned = await db.task.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true, status: true, completedAt: true, title: true },
  });
  if (owned.length !== ids.length) throw new NotFoundError("Tarefa");
  const moved = owned.find((t) => t.id === id)!;

  await db.$transaction(
    ids.map((taskId, index) =>
      db.task.updateMany({
        where: { id: taskId, userId },
        data:
          taskId === id
            ? { status, position: index * 1000, ...completionFields(status, moved) }
            : { position: index * 1000 },
      }),
    ),
  );
  if (moved.status !== status && status === "DONE") await logActivity(userId, "TASK_COMPLETED", moved.title);
}

export async function deleteTask(userId: string, id: string) {
  const task = await db.task.findFirst({ where: { id, userId }, select: { title: true } });
  if (!task) throw new NotFoundError("Tarefa");
  await db.task.deleteMany({ where: { id, userId } });
  await logActivity(userId, "TASK_DELETED", task.title);
}
