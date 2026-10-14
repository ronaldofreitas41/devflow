import { z } from "zod";
import { isDayKey } from "@/lib/dates";

/** Campo de data vindo de formulário: "" (vazio) ou YYYY-MM-DD válido. */
export const optionalDayKey = z
  .string()
  .trim()
  .refine((v) => v === "" || isDayKey(v), "Data inválida");

export const dayKeySchema = z.string().refine(isDayKey, "Data inválida");

export const idSchema = z.string().min(1).max(64);

export const optionalId = z.string().trim().max(64);
