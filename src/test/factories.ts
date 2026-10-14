import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export async function createUser(name = "Usuário") {
  return db.user.create({ data: { id: randomUUID(), name, email: `${randomUUID()}@test.dev` } });
}

export async function resetDb() {
  await db.$executeRawUnsafe(
    'TRUNCATE "activity", "focus_session", "task", "project", "session", "account", "verification", "user" CASCADE',
  );
}

export const projectInput = (over: Partial<Record<string, string>> = {}) => ({
  name: "Projeto",
  description: "",
  color: "#8b5cf6",
  status: "ACTIVE" as const,
  startDate: "",
  dueDate: "",
  ...over,
});

export const taskInput = (over: Record<string, unknown> = {}) => ({
  title: "Tarefa",
  description: "",
  projectId: "",
  priority: "MEDIUM" as const,
  status: "TODO" as const,
  dueDate: "",
  ...over,
});
