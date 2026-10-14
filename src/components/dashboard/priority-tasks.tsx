import type { TaskPriority } from "@prisma/client";
import { CalendarClock, CheckCheck } from "lucide-react";
import Link from "next/link";
import { PriorityBadge, ProjectDot } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDayKey, type DayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface PriorityTaskItem {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDay: DayKey | null;
  overdue: boolean;
  project: { name: string; color: string } | null;
}

export function PriorityTasks({ items }: { items: PriorityTaskItem[] }) {
  if (items.length === 0) {
    return <EmptyState compact icon={CheckCheck} title="Tudo em dia" description="Nenhuma tarefa aberta no momento." />;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <Link href={`/tasks?q=${encodeURIComponent(t.title)}`} className="block truncate text-sm font-medium hover:underline hover:underline-offset-4">
              {t.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {t.project && (
                <span className="inline-flex max-w-40 items-center gap-1.5 truncate">
                  <ProjectDot color={t.project.color} />
                  {t.project.name}
                </span>
              )}
              {t.dueDay && (
                <span className={cn("inline-flex items-center gap-1 tabular", t.overdue && "text-destructive")}>
                  <CalendarClock className="size-3.5" aria-hidden />
                  {t.overdue ? "Atrasada · " : ""}
                  {formatDayKey(t.dueDay)}
                </span>
              )}
            </div>
          </div>
          <PriorityBadge priority={t.priority} />
        </li>
      ))}
    </ul>
  );
}
