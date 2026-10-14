import type { Metadata } from "next";
import { Suspense } from "react";
import { Pagination } from "@/components/shared/pagination";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskList } from "@/components/tasks/task-list";
import { NewTaskButton, TaskFilters, ViewToggle } from "@/components/tasks/tasks-toolbar";
import type { TaskRow } from "@/components/tasks/types";
import { Skeleton } from "@/components/ui/skeleton";
import { dayKey } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getProjectOptions } from "@/server/queries";
import { listBoard, listTasks, type TaskWithProject } from "@/server/services/tasks";
import { taskFiltersSchema, type TaskFilters as Filters } from "@/server/validators/task";

export const metadata: Metadata = { title: "Tarefas" };

type SearchParams = PageProps<"/tasks">["searchParams"];

const DEFAULT_ORDER: Record<Filters["sort"], Filters["order"]> = {
  createdAt: "desc",
  dueDate: "asc",
  priority: "desc",
  title: "asc",
};

async function parseFilters(searchParams: SearchParams) {
  const raw = await searchParams;
  const filters = taskFiltersSchema.parse(raw);
  if (!raw.order) filters.order = DEFAULT_ORDER[filters.sort];
  return { filters, raw };
}

function toRow(t: TaskWithProject, now: Date): TaskRow {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? dayKey(t.dueDate) : "",
    overdue: Boolean(t.dueDate && t.status !== "DONE" && t.dueDate < now),
    project: t.project,
  };
}

async function TasksContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const { filters, raw } = await parseFilters(searchParams);
  const projects = await getProjectOptions(user.id);
  const now = new Date();
  const filtered = Boolean(filters.q) || filters.priority !== "ALL" || filters.projectId !== "ALL" || filters.status !== "ALL";

  if (filters.view === "board") {
    const board = await listBoard(user.id, filters);
    return (
      <TaskBoard
        projects={projects}
        board={{
          TODO: board.TODO.map((t) => toRow(t, now)),
          IN_PROGRESS: board.IN_PROGRESS.map((t) => toRow(t, now)),
          DONE: board.DONE.map((t) => toRow(t, now)),
        }}
      />
    );
  }

  const result = await listTasks(user.id, filters);
  const hrefFor = (page: number) => {
    const qs = new URLSearchParams(
      Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" && k !== "page" ? [[k, v]] : [])),
    );
    if (page > 1) qs.set("page", String(page));
    const s = qs.toString();
    return s ? `/tasks?${s}` : "/tasks";
  };

  return (
    <div className="grid gap-4">
      <TaskList tasks={result.items.map((t) => toRow(t, now))} projects={projects} filtered={filtered} />
      <Pagination page={result.page} pageCount={result.pageCount} total={result.total} pageSize={result.pageSize} hrefFor={hrefFor} />
    </div>
  );
}

async function Toolbar({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const [{ filters }, projects] = await Promise.all([parseFilters(searchParams), getProjectOptions(user.id)]);
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <ViewToggle />
        <NewTaskButton projects={projects} />
      </div>
      <div className="mt-4">
        <TaskFilters projects={projects} view={filters.view} />
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0">
          <Skeleton className="size-[18px] rounded-[5px]" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <PageContainer>
      <PageHeader title="Tarefas" description="Organize por prioridade, prazo e projeto — em lista ou no quadro." />
      <div className="mt-6">
        <Suspense
          fallback={
            <>
              <div className="flex justify-between">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-9 w-32" />
              </div>
              <Skeleton className="mt-4 h-9 w-full" />
            </>
          }
        >
          <Toolbar searchParams={searchParams} />
        </Suspense>
      </div>
      <div className="mt-5">
        <Suspense fallback={<ListSkeleton />}>
          <TasksContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
