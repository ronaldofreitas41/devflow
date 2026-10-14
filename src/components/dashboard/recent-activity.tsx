import type { ActivityType } from "@prisma/client";
import { CheckCircle2, FolderPlus, History, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

const META: Record<ActivityType, { icon: typeof Plus; verb: string; tone: string }> = {
  PROJECT_CREATED: { icon: FolderPlus, verb: "Projeto criado", tone: "text-primary" },
  PROJECT_UPDATED: { icon: Pencil, verb: "Projeto editado", tone: "text-muted-foreground" },
  PROJECT_DELETED: { icon: Trash2, verb: "Projeto excluído", tone: "text-destructive" },
  TASK_CREATED: { icon: Plus, verb: "Tarefa criada", tone: "text-primary" },
  TASK_UPDATED: { icon: Pencil, verb: "Tarefa editada", tone: "text-muted-foreground" },
  TASK_COMPLETED: { icon: CheckCircle2, verb: "Tarefa concluída", tone: "text-success" },
  TASK_DELETED: { icon: Trash2, verb: "Tarefa excluída", tone: "text-destructive" },
  FOCUS_COMPLETED: { icon: Timer, verb: "Sessão de foco", tone: "text-info" },
};

function relative(date: Date, now: Date) {
  const diff = Math.round((now.getTime() - date.getTime()) / 60000);
  if (diff < 1) return "agora";
  if (diff < 60) return `há ${diff} min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function RecentActivity({ items, now }: { items: { id: string; type: ActivityType; label: string; createdAt: Date }[]; now: Date }) {
  if (items.length === 0) {
    return <EmptyState compact icon={History} title="Nada por aqui ainda" description="Suas ações em projetos, tarefas e foco aparecem aqui." />;
  }
  return (
    <ol className="relative grid gap-0.5">
      {items.map((a) => {
        const m = META[a.type];
        return (
          <li key={a.id} className="flex items-start gap-3 rounded-md px-1 py-2">
            <m.icon className={cn("mt-0.5 size-4 shrink-0", m.tone)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="text-muted-foreground">{m.verb} · </span>
                <span className="break-words">{a.label}</span>
              </p>
            </div>
            <time dateTime={a.createdAt.toISOString()} className="shrink-0 text-xs text-subtle-foreground tabular">
              {relative(a.createdAt, now)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
