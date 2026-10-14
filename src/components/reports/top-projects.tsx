import { FolderKanban } from "lucide-react";
import { ProjectDot } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDuration } from "@/lib/dates";
import type { ReportData } from "@/server/services/report-calc";

export function TopProjects({ items }: { items: ReportData["topProjects"] }) {
  if (items.length === 0) {
    return <EmptyState compact icon={FolderKanban} title="Sem atividade em projetos" description="Conclua tarefas ou registre foco vinculado a projetos." />;
  }
  const max = Math.max(...items.map((p) => p.focusSeconds), 1);
  return (
    <ol className="grid gap-3.5">
      {items.map((p) => (
        <li key={p.id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <ProjectDot color={p.color} />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular">
              {p.completed} concl. · {formatDuration(p.focusSeconds)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised" aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${(p.focusSeconds / max) * 100}%`, background: p.color }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
