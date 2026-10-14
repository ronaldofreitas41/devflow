import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarsChart } from "@/components/charts/bars-chart";
import { ProductivityChart } from "@/components/charts/productivity-chart";
import { PriorityTasks } from "@/components/dashboard/priority-tasks";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { KpiStrip } from "@/components/shared/kpi-strip";
import { PageContainer } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_TIMEZONE, dayKey, formatDuration, toHours } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getDashboard } from "@/server/services/reports";
import { Timer } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: APP_TIMEZONE }).format(now));
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

async function Dashboard() {
  const user = await requireUser();
  const now = new Date();
  const d = await getDashboard(user.id, now);
  const { totals, previous, change } = d.week;
  const firstName = user.name.split(" ")[0];
  const longDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIMEZONE }).format(now);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{longDate}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-[22px]">
            {greeting(now)}, {firstName}
          </h1>
        </div>
        <Link href="/focus" className={buttonVariants({ variant: "secondary" })}>
          <Timer /> Iniciar foco
        </Link>
      </div>

      <KpiStrip
        className="mt-6"
        items={[
          { label: "Projetos ativos", value: String(d.activeProjects), accent: "var(--chart-1)" },
          { label: "Tarefas pendentes", value: String(d.openTasks), accent: "var(--muted-foreground)", previous: `${totals.overdue} atrasada${totals.overdue === 1 ? "" : "s"}` },
          {
            label: "Concluídas na semana",
            value: String(totals.completed),
            delta: change.completed,
            previous: `Semana anterior: ${previous.completed}`,
            accent: "var(--chart-3)",
            hint: "De segunda até hoje, comparado ao mesmo intervalo da semana passada.",
          },
          {
            label: "Foco na semana",
            value: formatDuration(totals.focusSeconds),
            delta: change.focusSeconds,
            previous: `Semana anterior: ${formatDuration(previous.focusSeconds)}`,
            accent: "var(--chart-2)",
            hint: "Soma das sessões de foco concluídas, de segunda até hoje.",
          },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Produtividade diária</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ProductivityChart data={d.daily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Horas de foco por semana</CardTitle>
              <CardDescription>
                Últimas 8 semanas · média {toHours((d.weekly.reduce((a, w) => a + w.hours, 0) / d.weekly.length) * 3600)} h
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarsChart data={d.weekly} dataKey="hours" name="Horas" unit="h" highlightLast height={240} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tarefas prioritárias</CardTitle>
              <CardDescription>Abertas, por prioridade e prazo</CardDescription>
            </div>
            <Link href="/tasks?status=OPEN&sort=priority" className="text-[13px] text-muted-foreground hover:text-foreground">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            <PriorityTasks
              items={d.priorityTasks.map((t) => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                dueDay: t.dueDate ? dayKey(t.dueDate) : null,
                overdue: Boolean(t.dueDate && t.dueDate < now),
                project: t.project,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Atividade recente</CardTitle>
              <CardDescription>O que mudou por último</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RecentActivity items={d.recent} now={now} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-7 w-56" />
      <Skeleton className="mt-6 h-[104px] w-full rounded-lg" />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[320px] rounded-lg lg:col-span-2" />
        <Skeleton className="h-[320px] rounded-lg" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <PageContainer>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </PageContainer>
  );
}
