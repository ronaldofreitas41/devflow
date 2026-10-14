import { z } from "zod";
import { AppError } from "@/server/errors";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/** Converte qualquer exceção em um resultado serializável e consistente para o cliente. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: "Verifique os campos destacados.", fieldErrors: z.flattenError(err).fieldErrors };
    }
    if (err instanceof AppError) return { ok: false, error: err.message };
    // Erros de controle do Next (redirect/notFound) precisam continuar propagando.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error(err);
    return { ok: false, error: "Algo deu errado. Tente novamente." };
  }
}
