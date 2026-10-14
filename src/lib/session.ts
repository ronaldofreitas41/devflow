import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/server/errors";

/** Lê e valida a sessão no servidor (consulta o banco). Deduplicado por request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Para páginas: redireciona ao login quando não há sessão válida. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/** Para Server Actions / Route Handlers: lança erro tratável. */
export async function requireUserId() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session.user.id;
}
