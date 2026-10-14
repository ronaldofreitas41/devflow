import { beforeAll, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resetDb } from "@/test/factories";

const email = "auth@test.dev";
const password = "senha-segura-123";

function cookieHeader(setCookie: string | null) {
  // Extrai "nome=valor" dos Set-Cookie para simular o navegador
  return (setCookie ?? "")
    .split(/,(?=\s*[\w.-]+=)/)
    .map((c) => c.split(";")[0]!.trim())
    .join("; ");
}

describe("autenticação (Better Auth + Prisma)", () => {
  beforeAll(resetDb);

  it("cadastra usuário com senha armazenada como hash", async () => {
    const res = await auth.api.signUpEmail({ body: { name: "Auth", email, password } });
    expect(res.user.email).toBe(email);
    const account = await db.account.findFirst({ where: { userId: res.user.id, providerId: "credential" } });
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toContain(password);
  });

  it("rejeita e-mail duplicado", async () => {
    await expect(auth.api.signUpEmail({ body: { name: "Outro", email, password } })).rejects.toThrow();
  });

  it("rejeita senha incorreta", async () => {
    await expect(auth.api.signInEmail({ body: { email, password: "errada-123456" } })).rejects.toThrow();
  });

  it("login cria sessão validada no servidor e logout a invalida", async () => {
    const res = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
    expect(res.status).toBe(200);
    const headers = new Headers({ cookie: cookieHeader(res.headers.get("set-cookie")) });

    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe(email);
    expect(await db.session.count({ where: { userId: session!.user.id } })).toBeGreaterThan(0);

    await auth.api.signOut({ headers });
    expect(await auth.api.getSession({ headers })).toBeNull();
  });

  it("cookie forjado não autentica", async () => {
    const headers = new Headers({ cookie: "better-auth.session_token=forjado.assinatura" });
    expect(await auth.api.getSession({ headers })).toBeNull();
  });
});
