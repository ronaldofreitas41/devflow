import { z } from "zod";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { idSchema, optionalDayKey, optionalId } from "./common";

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(140, "Máximo de 140 caracteres"),
  description: z.string().trim().max(2000, "Máximo de 2000 caracteres"),
  projectId: optionalId,
  priority: z.enum(TASK_PRIORITY),
  status: z.enum(TASK_STATUS),
  dueDate: optionalDayKey,
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export const TASK_SORT = ["createdAt", "dueDate", "priority", "title"] as const;

export const taskFiltersSchema = z.object({
  q: z.string().trim().max(140).catch(""),
  status: z.enum([...TASK_STATUS, "ALL", "OPEN"]).catch("ALL"),
  priority: z.enum([...TASK_PRIORITY, "ALL"]).catch("ALL"),
  projectId: z.string().max(64).catch("ALL"),
  sort: z.enum(TASK_SORT).catch("createdAt"),
  order: z.enum(["asc", "desc"]).catch("desc"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  view: z.enum(["list", "board"]).catch("list"),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;

export const moveTaskSchema = z.object({
  id: idSchema,
  status: z.enum(TASK_STATUS),
  orderedIds: z.array(idSchema).max(500),
});
