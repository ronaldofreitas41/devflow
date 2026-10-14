"use client";

import { CalendarClock, Check, ListChecks, Plus } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { PriorityBadge, ProjectDot, TaskStatusBadge } from "@/components/shared/badges";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatDayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { TaskActionsMenu } from "./task-actions-menu";
import { TaskFormDialog } from "./task-form-dialog";
import type { ProjectOption, TaskRow } from "./types";
import { useTaskMutations } from "./use-task-mutations";

export function DueLabel({ task, className }: { task: TaskRow; className?: string }) {
  if (!task.dueDate) return <span className={cn("text-xs text-subtle-foreground", className)}>Sem prazo</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs tabular", task.overdue ? "text-destructive" : "text-muted-foreground", className)}>
      <CalendarClock className="size-3.5" aria-hidden />
      {formatDayKey(task.dueDate)}
      {task.overdue && <span className="sr-only">(atrasada)</span>}
    </span>
  );
}

function DoneToggle({ task, onToggle }: { task: TaskRow; onToggle: () => void }) {
  const done = task.status === "DONE";
  return (
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Reabrir "${task.title}"` : `Concluir "${task.title}"`}
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
        done ? "border-success bg-success text-background" : "border-border-strong hover:border-primary",
      )}
    >
      {done && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

export function TaskList({ tasks, projects, filtered }: { tasks: TaskRow[]; projects: ProjectOption[]; filtered: boolean }) {
  const m = useTaskMutations();
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, update: { id: string; status: TaskRow["status"] }) =>
    state.map((t) => (t.id === update.id ? { ...t, status: update.status, overdue: update.status === "DONE" ? false : t.overdue } : t)),
  );

  function toggle(task: TaskRow) {
    const status = task.status === "DONE" ? "TODO" : "DONE";
    start(async () => {
      setOptimistic({ id: task.id, status });
      await m.changeStatus(task, status);
    });
  }

  function move(task: TaskRow, status: TaskRow["status"]) {
    start(async () => {
      setOptimistic({ id: task.id, status });
      await m.changeStatus(task, status);
    });
  }

  if (tasks.length === 0) {
    return (
      <>
        <EmptyState
          icon={ListChecks}
          title={filtered ? "Nenhuma tarefa encontrada" : "Sua lista está vazia"}
          description={filtered ? "Ajuste a busca ou os filtros." : "Crie a primeira tarefa e defina uma prioridade."}
          action={
            !filtered && (
              <Button onClick={() => m.setCreating(true)}>
                <Plus /> Nova tarefa
              </Button>
            )
          }
        />
        <TaskFormDialog open={m.creating} onOpenChange={m.setCreating} projects={projects} />
      </>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Cabeçalho visível só no desktop; no mobile cada linha vira um cartão compacto */}
        <div className="hidden grid-cols-[auto_minmax(0,1fr)_160px_110px_120px_100px_40px] items-center gap-4 border-b border-border px-4 py-2.5 text-xs text-muted-foreground lg:grid">
          <span className="w-[18px]" />
          <span>Tarefa</span>
          <span>Projeto</span>
          <span>Prioridade</span>
          <span>Status</span>
          <span>Vencimento</span>
          <span />
        </div>
        <ul className="divide-y divide-border">
          {optimistic.map((task) => (
            <li
              key={task.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-hover/50 lg:grid-cols-[auto_minmax(0,1fr)_160px_110px_120px_100px_40px] lg:items-center lg:gap-4"
            >
              <span className="pt-0.5 lg:pt-0">
                <DoneToggle task={task} onToggle={() => toggle(task)} />
              </span>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => m.setEditing(task)}
                  className={cn(
                    "block max-w-full truncate text-left text-sm font-medium hover:underline hover:underline-offset-4",
                    task.status === "DONE" && "text-muted-foreground line-through decoration-subtle-foreground",
                  )}
                >
                  {task.title}
                </button>
                {task.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>}
                {/* Metadados empilhados no mobile */}
                <div className="mt-2 flex flex-wrap items-center gap-2 lg:hidden">
                  <PriorityBadge priority={task.priority} />
                  <TaskStatusBadge status={task.status} />
                  {task.project && (
                    <span className="inline-flex max-w-40 items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <ProjectDot color={task.project.color} />
                      {task.project.name}
                    </span>
                  )}
                  <DueLabel task={task} />
                </div>
              </div>
              <span className="hidden min-w-0 items-center gap-2 truncate text-sm text-muted-foreground lg:flex">
                {task.project ? (
                  <>
                    <ProjectDot color={task.project.color} />
                    <span className="truncate">{task.project.name}</span>
                  </>
                ) : (
                  <span className="text-subtle-foreground">—</span>
                )}
              </span>
              <span className="hidden lg:block">
                <PriorityBadge priority={task.priority} />
              </span>
              <span className="hidden lg:block">
                <TaskStatusBadge status={task.status} />
              </span>
              <span className="hidden lg:block">
                <DueLabel task={task} />
              </span>
              <span className="-mt-1 -mr-2 lg:m-0">
                <TaskActionsMenu
                  task={task}
                  onEdit={() => m.setEditing(task)}
                  onDelete={() => m.setDeleting(task)}
                  onMove={(s) => move(task, s)}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <TaskFormDialog open={!!m.editing} onOpenChange={(o) => !o && m.setEditing(null)} task={m.editing} projects={projects} />
      <ConfirmDelete
        open={!!m.deleting}
        onOpenChange={(o) => !o && m.setDeleting(null)}
        title={`Excluir "${m.deleting?.title ?? ""}"?`}
        description="Sessões de foco ligadas a ela serão mantidas no histórico. Esta ação não pode ser desfeita."
        onConfirm={m.confirmDelete}
      />
    </>
  );
}
