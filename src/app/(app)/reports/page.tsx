import type { Metadata } from "next";
import { Suspense } from "react";
import { PriorityChart } from "@/components/charts/priority-chart";
import { ProductivityChart } from "@/components/charts/productivity-chart";
import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { ReportFilters } from "@/components/reports/report-filters";
import { TopProjects } from "@/components/reports/top-projects";
import { PriorityBadge } from "@/components/shared/badges";
import { KpiStrip } from "@/components/shared/kpi-strip";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dayKey, formatDayKey, formatDuration } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getProjectOptions } from "@/server/queries";
import { getReport } from "@/server/services/reports";
import { parseReportQuery } from "@/server/validators/report";

export const metadata: Metadata = { title: "Relatórios" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Report({ searchParams }: { searchParams: PageProps<"/reports">["searchParams"] }) {
  const user = await requireUser();
  const raw = await searchParams;
  const today = dayKey(new Date());
  const projects = await getProjectOptions(user.id);
  const parsed = parseReportQuery({ from: str(raw.from), to: str(raw.to), projectId: str(raw.projectId) }, today);
  // Projeto inexistente/alheio na URL → cai para "todos" em vez de vazar erro.
  const projectId = parsed.projectId && projects.some((p) => p.id === parsed.projectId) ? parsed.projectId : null;
  const report = await getReport(user.id, parsed.range, projectId);
  const projectLabel = projectId ? `Projeto: ${projects.find((p) => p.id === projectId)!.name}` : "Todos os projetos";
  const { totals, previous, change } = report;
  const prevLabel = `${formatDayKey(report.previousRange.from)} – ${formatDayKey(report.previousRange.to)}`;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description={`${formatDayKey(report.range.from)} – ${formatDayKey(report.range.to)}, comparado a ${prevLabel}`}
        actions={<ExportPdfButton report={report} projectLabel={projectLabel} userName={user.name} />}
      />

      <div className="mt-6">
        <ReportFilters range={report.range} today={today} projectId={projectId} projects={projects} />
      </div>

      <KpiStrip
        className="mt-4"
        items={[
          {
            label: "Concluídas",
            value: String(totals.completed),
            delta: change.completed,
            previous: `Anterior: ${previous.completed}`,
            accent: "var(--chart-3)",
            hint: "Tarefas marcadas como concluídas dentro do período.",
          },
          {
            label: "Pendentes",
            value: String(totals.pending),
            delta: change.pending,
            invertDelta: true,
            previous: `Anterior: ${previous.pending}`,
            accent: "var(--muted-foreground)",
            hint: "Tarefas criadas até o fim do período e ainda abertas naquele momento.",
          },
          {
            label: "Atrasadas",
            value: String(totals.overdue),
            delta: change.overdue,
            invertDelta: true,
            previous: `Anterior: ${previous.overdue}`,
            accent: "var(--chart-5)",
            hint: "Pendentes cujo prazo já tinha vencido no fim do período.",
          },
          {
            label: "Horas focadas",
            value: formatDuration(totals.focusSeconds),
            delta: change.focusSeconds,
            previous: `Anterior: ${formatDuration(previous.focusSeconds)}`,
            accent: "var(--chart-2)",
            hint: "Soma das sessões de foco concluídas iniciadas no período.",
          },
        ]}
      />

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Evolução diária</CardTitle>
            <CardDescription>
              Taxa de conclusão {totals.completionRate.toLocaleString("pt-BR")}% · {totals.sessions} sessões de foco
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ProductivityChart data={report.daily} height={260} />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distribuição por prioridade</CardTitle>
              <CardDescription>Concluídas no período e pendentes ao final</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <PriorityChart data={report.priority} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Projetos mais ativos</CardTitle>
              <CardDescription>Por horas de foco e tarefas concluídas</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <TopProjects items={report.topProjects} />
          </CardContent>
        </Card>
      </div>

      {report.overdueTasks.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <div>
              <CardTitle>Tarefas atrasadas</CardTitle>
              <CardDescription>As mais antigas primeiro</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="-mx-5 overflow-x-auto px-5 scrollbar-thin">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="pb-2 font-normal">Tarefa</th>
                    <th scope="col" className="pb-2 font-normal">Prioridade</th>
                    <th scope="col" className="pb-2 text-right font-normal">Prazo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.overdueTasks.map((t) => (
                    <tr key={t.id}>
                      <td className="w-3/5 max-w-0 truncate py-2.5 pr-4">{t.title}</td>
                      <td className="py-2.5 pr-4">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="py-2.5 text-right text-destructive tabular">{formatDayKey(t.dueDay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ReportSkeleton() {
  return (
    <>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-72" />
      <Skeleton className="mt-6 h-36 rounded-lg" />
      <Skeleton className="mt-4 h-[104px] rounded-lg" />
      <Skeleton className="mt-4 h-80 rounded-lg" />
    </>
  );
}

export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  return (
    <PageContainer>
      <Suspense fallback={<ReportSkeleton />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
