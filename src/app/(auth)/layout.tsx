import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/shared/logo";
import { getSession } from "@/lib/session";

async function RedirectIfAuthenticated() {
  // Valida a sessão de verdade no servidor; um cookie expirado não conta.
  const session = await getSession();
  if (session) redirect("/dashboard");
  return null;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <Suspense>
        <RedirectIfAuthenticated />
      </Suspense>
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Logo />
        <div className="max-w-md">
          <p className="text-[28px] leading-[1.15] font-semibold tracking-tight text-balance">
            Planeje o trabalho, proteja o tempo de foco e veja o progresso de verdade.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3"><span className="mt-1.5 size-1.5 rounded-full bg-primary" />Projetos e tarefas em lista ou quadro</li>
            <li className="flex gap-3"><span className="mt-1.5 size-1.5 rounded-full bg-info" />Sessões de foco que sobrevivem a recarregamentos</li>
            <li className="flex gap-3"><span className="mt-1.5 size-1.5 rounded-full bg-success" />Relatórios comparativos exportáveis em PDF</li>
          </ul>
        </div>
        <TimelineDecor />
      </aside>
      <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}

/** Uma semana de foco, desenhada como barras — o único elemento visual do painel. */
function TimelineDecor() {
  const bars = [38, 64, 52, 88, 72, 26, 14];
  const days = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  return (
    <div aria-hidden className="flex items-end gap-3">
      {bars.map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-7 rounded-sm bg-primary/80" style={{ height: h, opacity: 0.35 + h / 140 }} />
          <span className="text-[11px] text-subtle-foreground">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}
