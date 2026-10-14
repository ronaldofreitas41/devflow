"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import * as projects from "@/server/services/projects";
import { idSchema } from "@/server/validators/common";
import { projectInputSchema } from "@/server/validators/project";
import { run } from "./result";

function revalidate() {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}

export async function createProjectAction(input: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    const data = projectInputSchema.parse(input);
    const p = await projects.createProject(userId, data);
    revalidate();
    return { id: p.id };
  });
}

export async function updateProjectAction(id: unknown, input: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    const data = projectInputSchema.parse(input);
    await projects.updateProject(userId, idSchema.parse(id), data);
    revalidate();
    return undefined;
  });
}

export async function deleteProjectAction(id: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    await projects.deleteProject(userId, idSchema.parse(id));
    revalidate();
    return undefined;
  });
}
