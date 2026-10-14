import type { Metadata } from "next";
import { Suspense } from "react";
import { BarsChart } from "@/components/charts/bars-chart";
import { FocusHistory } from "@/components/focus/focus-history";
import { FocusTimer, type ActiveSessionDTO } from "@/components/focus/focus-timer";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { SelectFilter } from "@/components/shared/url-filters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dayKey, formatDuration } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getProjectOptions } from "@/server/queries";
import { focusByDay, getActiveSession, lastNDays, listSessionHistory } from "@/server/services/focus";
import { listTaskOptions } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Foco" };

const PERIODS = { "7": 7, "30": 30, "90": 90 } as const;

async function Timer() {
  const user = await requireUser();
  const [active, projects, tasks] = await Promise.all([
    getActiveSession(user.id),
    getProjectOptions(user.id),
    listTaskOptions(user.id),
  ]);
  const session: ActiveSessionDTO | null = active
    ? {
        id: active.id,
        status: active.status as ActiveSessionDTO["status"],
        plannedMinutes: active.plannedMinutes,
        startedAt: active.startedAt.toISOString(),
        pausedAt: active.pausedAt?.toISOString() ?? null,
        totalPausedMs: active.totalPausedMs,
        project: active.project,
        task: active.task,
      }
    : null;
  return <FocusTimer session={session} serverNow={new Date().toISOString()} projects={projects} tasks={tasks} />;
}

async function Stats({ searchParams }: { searchParams: PageProps<"/focus">["searchParams"] }) {
  const user = await requireUser();
  const raw = (await searchParams).period;
  const days = PERIODS[(typeof raw === "string" ? raw : "7") as keyof typeof PERIODS] ?? 7;
  const today = dayKey(new Date());
  const [byDay, todayStats, history] = await Promise.all([
    focusByDay(user.id, lastNDays(today, days)),
    focusByDay(user.id, { from: today, to: today }),
    listSessionHistory(user.id, 12),
  ]);
  const avg = byDay.totalSeconds / days;

  return (
    <>
      <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-card">
        {[
          { label: "Hoje", value: formatDuration(todayStats.totalSeconds) },
          { label: `${days} dias`, value: formatDuration(byDay.totalSeconds) },
          { label: "Média/dia", value: formatDuration(avg) },
        ].map((s) => (
          <div key={s.label} className="min-w-0 px-3 py-3.5 sm:px-4">
            <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 truncate text-lg font-semibold tabular">{s.value}</dd>
          </div>
        ))}
      </dl>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Minutos por dia</CardTitle>
            <CardDescription>{byDay.count} sessões no período</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BarsChart data={byDay.days} dataKey="minutes" name="Foco" unit="min" color="var(--chart-2)" height={200} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <FocusHistory items={history} />
        </CardContent>
      </Card>
    </>
  );
}

export default function FocusPage({ searchParams }: PageProps<"/focus">) {
  return (
    <PageContainer>
      <PageHeader
        title="Sessões de foco"
        description="O tempo é salvo no servidor: recarregar a página ou trocar de aba não perde a sessão."
        actions={
          <Suspense fallback={<Skeleton className="h-9 w-36" />}>
            <SelectFilter
              name="period"
              label="Período do histórico"
              defaultValue="7"
              resetPage={false}
              options={[
                { value: "7", label: "Últimos 7 dias" },
                { value: "30", label: "Últimos 30 dias" },
                { value: "90", label: "Últimos 90 dias" },
              ]}
            />
          </Suspense>
        }
      />
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
          <Timer />
        </Suspense>
        <div className="min-w-0">
          <Suspense
            fallback={
              <>
                <Skeleton className="h-[74px] rounded-lg" />
                <Skeleton className="mt-4 h-72 rounded-lg" />
              </>
            }
          >
            <Stats searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </PageContainer>
  );
}
