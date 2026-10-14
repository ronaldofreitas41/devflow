import { History } from "lucide-react";
import { ProjectDot } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime, formatDuration } from "@/lib/dates";

export function FocusHistory({
  items,
}: {
  items: {
    id: string;
    startedAt: Date;
    durationSeconds: number | null;
    plannedMinutes: number;
    project: { name: string; color: string } | null;
    task: { title: string } | null;
  }[];
}) {
  if (items.length === 0) {
    return <EmptyState compact icon={History} title="Nenhuma sessão concluída" description="Finalize uma sessão para vê-la aqui." />;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm">{s.task?.title ?? s.project?.name ?? "Foco livre"}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {s.project && s.task && (
                <>
                  <ProjectDot color={s.project.color} />
                  <span className="truncate">{s.project.name}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <time dateTime={s.startedAt.toISOString()} className="tabular">
                {formatDateTime(s.startedAt)}
              </time>
            </p>
          </div>
          <span className="shrink-0 font-mono text-sm tabular">{formatDuration(s.durationSeconds ?? 0)}</span>
        </li>
      ))}
    </ul>
  );
}
