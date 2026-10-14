"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import * as focus from "@/server/services/focus";
import { idSchema } from "@/server/validators/common";
import { startFocusSchema } from "@/server/validators/focus";
import { run } from "./result";

function revalidate() {
  revalidatePath("/focus");
  revalidatePath("/dashboard");
}

export async function startFocusAction(input: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    const s = await focus.startSession(userId, startFocusSchema.parse(input));
    revalidate();
    return { ...s, startedAt: s.startedAt.toISOString(), pausedAt: null, serverNow: new Date().toISOString() };
  });
}

export async function pauseFocusAction(id: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    await focus.pauseSession(userId, idSchema.parse(id));
    revalidate();
    return undefined;
  });
}

export async function resumeFocusAction(id: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    await focus.resumeSession(userId, idSchema.parse(id));
    revalidate();
    return undefined;
  });
}

export async function finishFocusAction(id: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    const r = await focus.finishSession(userId, idSchema.parse(id));
    revalidate();
    return r;
  });
}

export async function cancelFocusAction(id: unknown) {
  return run(async () => {
    const userId = await requireUserId();
    await focus.cancelSession(userId, idSchema.parse(id));
    revalidate();
    return undefined;
  });
}
