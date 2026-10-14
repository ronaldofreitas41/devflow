import { z } from "zod";
import { optionalId } from "./common";

export const startFocusSchema = z.object({
  plannedMinutes: z.coerce.number().int("Use minutos inteiros").min(1, "Mínimo de 1 minuto").max(180, "Máximo de 180 minutos"),
  projectId: optionalId,
  taskId: optionalId,
});

export type StartFocusInput = z.infer<typeof startFocusSchema>;
