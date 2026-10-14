import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { endOfDay, startOfDay } from "@/lib/dates";
import { NotFoundError } from "@/server/errors";
import type { ProjectFilters, ProjectInput } from "@/server/validators/project";
import { logActivity } from "./activity";

/**
 * Regra de ouro: toda consulta filtra por `userId`. Um projeto de outro usuário
 * é tratado exatamente como inexistente.
 */

function toData(input: ProjectInput) {
  return {
    name: input.name,
    description: input.description || null,
    color: input.color,
    status: input.status,
    startDate: input.startDate ? startOfDay(input.startDate) : null,
    dueDate: input.dueDate ? endOfDay(input.dueDate) : null,
  };
}

export async function assertProjectOwned(userId: string, projectId: string) {
  const exists = await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!exists) throw new NotFoundError("Projeto");
}

export async function listProjects(userId: string, filters: ProjectFilters) {
  const where: Prisma.ProjectWhereInput = { userId };
  if (filters.status !== "ALL") where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const projects = await db.project.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  if (projects.length === 0) return [];

  // Progresso calculado a partir das tarefas, numa única consulta agregada.
  const counts = await db.task.groupBy({
    by: ["projectId", "status"],
    where: { userId, projectId: { in: projects.map((p) => p.id) } },
    _count: { _all: true },
  });

  return projects.map((p) => {
    const rows = counts.filter((c) => c.projectId === p.id);
    const total = rows.reduce((acc, r) => acc + r._count._all, 0);
    const done = rows.find((r) => r.status === "DONE")?._count._all ?? 0;
    return { ...p, taskCount: total, doneCount: done, progress: total === 0 ? 0 : Math.round((done / total) * 100) };
  });
}

export type ProjectWithProgress = Awaited<ReturnType<typeof listProjects>>[number];

export async function listProjectOptions(userId: string) {
  return db.project.findMany({
    where: { userId, status: { not: "ARCHIVED" } },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
}

export async function getProject(userId: string, id: string) {
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) throw new NotFoundError("Projeto");
  return project;
}

export async function createProject(userId: string, input: ProjectInput) {
  const project = await db.project.create({ data: { ...toData(input), userId } });
  await logActivity(userId, "PROJECT_CREATED", project.name);
  return project;
}

export async function updateProject(userId: string, id: string, input: ProjectInput) {
  const { count } = await db.project.updateMany({ where: { id, userId }, data: toData(input) });
  if (count === 0) throw new NotFoundError("Projeto");
  await logActivity(userId, "PROJECT_UPDATED", input.name);
  return getProject(userId, id);
}

export async function deleteProject(userId: string, id: string) {
  const project = await db.project.findFirst({ where: { id, userId }, select: { name: true } });
  if (!project) throw new NotFoundError("Projeto");
  // Tarefas e sessões são preservadas, apenas desvinculadas (onDelete: SetNull).
  await db.project.deleteMany({ where: { id, userId } });
  await logActivity(userId, "PROJECT_DELETED", project.name);
}
