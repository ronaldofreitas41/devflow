import type { Metadata } from "next";
import { Suspense } from "react";
import { NewProjectButton, ProjectsGrid, type ProjectCardData } from "@/components/projects/projects-view";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { SearchFilter, SelectFilter } from "@/components/shared/url-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { PROJECT_STATUS, PROJECT_STATUS_LABEL } from "@/lib/constants";
import { dayKey } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listProjects } from "@/server/services/projects";
import { projectFiltersSchema } from "@/server/validators/project";

export const metadata: Metadata = { title: "Projetos" };

async function ProjectsContent({ searchParams }: { searchParams: PageProps<"/projects">["searchParams"] }) {
  const user = await requireUser();
  const filters = projectFiltersSchema.parse(await searchParams);
  const projects = await listProjects(user.id, filters);
  const now = new Date();

  const data: ProjectCardData[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    color: p.color,
    status: p.status,
    startDate: p.startDate ? dayKey(p.startDate) : "",
    dueDate: p.dueDate ? dayKey(p.dueDate) : "",
    taskCount: p.taskCount,
    doneCount: p.doneCount,
    progress: p.progress,
    overdue: Boolean(p.dueDate && p.dueDate < now && p.status !== "COMPLETED" && p.status !== "ARCHIVED"),
  }));

  return <ProjectsGrid projects={data} filtered={Boolean(filters.q) || filters.status !== "ALL"} />;
}

function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-5 w-20 rounded-full" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="mt-4 h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  return (
    <PageContainer>
      <PageHeader title="Projetos" description="Agrupe tarefas e acompanhe o avanço de cada frente." actions={<NewProjectButton />} />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Suspense fallback={<Skeleton className="h-9 flex-1" />}>
          <SearchFilter placeholder="Buscar projetos" className="flex-1" />
          <SelectFilter
            name="status"
            label="Filtrar por status"
            options={[{ value: "ALL", label: "Todos os status" }, ...PROJECT_STATUS.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))]}
          />
        </Suspense>
      </div>
      <div className="mt-5">
        <Suspense fallback={<GridSkeleton />}>
          <ProjectsContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
