"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TASK_STATUS } from "@/lib/constants";
import { requireUserId } from "@/lib/session";
import * as tasks from "@/server/services/tasks";
import { idSchema } from "@/server/validators/common";
import { moveTaskSchema, taskInputSchema } from "@/server/validators/task";
import { run } from "./result";

function revalidate() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
}

export async function createTaskAction(input: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    const t = await tasks.createTask(userId, taskInputSchema.parse(input));
    revalidate();
    return { id: t.id };
  });
}

export async function updateTaskAction(id: unknown, input: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    await tasks.updateTask(userId, idSchema.parse(id), taskInputSchema.parse(input));
    revalidate();
    return undefined;
  });
}

export async function setTaskStatusAction(id: unknown, status: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    await tasks.setTaskStatus(userId, idSchema.parse(id), z.enum(TASK_STATUS).parse(status));
    revalidate();
    return undefined;
  });
}

export async function moveTaskAction(input: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    const { id, status, orderedIds } = moveTaskSchema.parse(input);
    await tasks.moveTask(userId, id, status, orderedIds);
    revalidate();
    return undefined;
  });
}

export async function deleteTaskAction(id: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    await tasks.deleteTask(userId, idSchema.parse(id));
    revalidate();
    return undefined;
  });
}
