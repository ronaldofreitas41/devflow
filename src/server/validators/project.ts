import { z } from "zod";
import { PROJECT_STATUS } from "@/lib/constants";
import { optionalDayKey } from "./common";

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(1, "Informe um nome").max(80, "Máximo de 80 caracteres"),
    description: z.string().trim().max(500, "Máximo de 500 caracteres"),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
    status: z.enum(PROJECT_STATUS),
    startDate: optionalDayKey,
    dueDate: optionalDayKey,
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, {
    message: "O prazo deve ser igual ou posterior ao início",
    path: ["dueDate"],
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectFiltersSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum([...PROJECT_STATUS, "ALL"]).catch("ALL"),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;
