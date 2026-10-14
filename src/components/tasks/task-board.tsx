"use client";

import type { TaskStatus } from "@prisma/client";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PriorityBadge, ProjectDot } from "@/components/shared/badges";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { TASK_STATUS, TASK_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { moveTaskAction } from "@/server/actions/tasks";
import { TaskActionsMenu } from "./task-actions-menu";
import { DueLabel } from "./task-list";
import { TaskFormDialog } from "./task-form-dialog";
import type { ProjectOption, TaskRow } from "./types";
import { useTaskMutations } from "./use-task-mutations";

type Board = Record<TaskStatus, TaskRow[]>;

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  TODO: "var(--muted-foreground)",
  IN_PROGRESS: "var(--primary)",
  DONE: "var(--success)",
};

function moveInBoard(board: Board, id: string, to: TaskStatus, index: number): Board {
  const from = TASK_STATUS.find((s) => board[s].some((t) => t.id === id))!;
  const task = board[from].find((t) => t.id === id)!;
  const next: Board = { TODO: [...board.TODO], IN_PROGRESS: [...board.IN_PROGRESS], DONE: [...board.DONE] };
  next[from] = next[from].filter((t) => t.id !== id);
  const target = next[to];
  const clamped = Math.max(0, Math.min(index, target.length));
  target.splice(clamped, 0, { ...task, status: to, overdue: to === "DONE" ? false : task.overdue });
  return next;
}

export function TaskBoard({ board: initial, projects }: { board: Board; projects: ProjectOption[] }) {
  const router = useRouter();
  const m = useTaskMutations();
  const [board, setBoard] = useState(initial);
  const [dragId, setDragIdState] = useState<string | null>(null);
  // Ref evita depender de re-render entre dragstart e o primeiro dragover.
  const dragRef = useRef<string | null>(null);
  const setDragId = (id: string | null) => {
    dragRef.current = id;
    setDragIdState(id);
  };
  const [over, setOver] = useState<{ status: TaskStatus; index: number } | null>(null);
  const [, start] = useTransition();

  // Recebe dados novos do servidor após router.refresh() (ajuste de estado durante o render).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setBoard(initial);
  }

  function persist(id: string, to: TaskStatus, index: number) {
    const previous = board;
    const next = moveInBoard(board, id, to, index);
    setBoard(next);
    start(async () => {
      const res = await moveTaskAction({ id, status: to, orderedIds: next[to].map((t) => t.id) });
      if (!res.ok) {
        setBoard(previous);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function indexFromPointer(e: React.DragEvent, status: TaskStatus) {
    const cards = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[data-card]"));
    const i = cards.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    return i === -1 ? board[status].length : i;
  }

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground md:hidden">Deslize para ver as colunas. Use o menu ⋯ de cada cartão para mover.</p>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin sm:-mx-6 sm:px-6 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:overflow-visible md:px-0">
        {TASK_STATUS.map((status) => {
          const tasks = board[status];
          const isOver = over?.status === status;
          return (
            <section
              key={status}
              aria-label={`${TASK_STATUS_LABEL[status]} (${tasks.length})`}
              className={cn(
                "flex w-[84vw] max-w-sm shrink-0 snap-start flex-col rounded-lg border border-border bg-surface/60 md:w-auto md:max-w-none",
                isOver && "border-primary/50 bg-primary-soft/40",
              )}
              onDragEnter={(e) => {
                if (dragRef.current) e.preventDefault();
              }}
              onDragOver={(e) => {
                if (!dragRef.current) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const index = indexFromPointer(e, status);
                if (over?.status !== status || over.index !== index) setOver({ status, index });
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = dragRef.current ?? e.dataTransfer.getData("text/plain");
                if (id) persist(id, status, indexFromPointer(e, status));
                setDragId(null);
                setOver(null);
              }}
            >
              <header className="flex items-center justify-between px-3 py-2.5">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <span className="size-2 rounded-full" style={{ background: COLUMN_ACCENT[status] }} aria-hidden />
                  {TASK_STATUS_LABEL[status]}
                </h2>
                <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-xs text-muted-foreground tabular">{tasks.length}</span>
              </header>
              <ul className="flex min-h-32 flex-1 flex-col gap-2 px-2 pb-2">
                {tasks.map((task, i) => (
                  <li key={task.id} data-card className="relative">
                    {isOver && over.index === i && dragId !== task.id && (
                      <span aria-hidden className="absolute -top-1.5 right-1 left-1 h-0.5 rounded-full bg-primary" />
                    )}
                    <article
                      draggable
                      onDragStart={(e) => {
                        setDragId(task.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", task.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button, [role=menu]")) return;
                        m.setEditing(task);
                      }}
                      className={cn(
                        "group cursor-pointer rounded-md border border-border bg-card p-3 transition-[border-color,opacity] hover:border-border-strong md:cursor-grab md:active:cursor-grabbing",
                        dragId === task.id && "opacity-40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 hidden size-4 shrink-0 text-subtle-foreground md:block" aria-hidden />
                        {/* Texto (não botão): botões dentro de um elemento arrastável impedem o drag no Chrome.
                            A edição fica no clique do cartão e no menu ⋯ (acessível por teclado). */}
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-sm leading-snug font-medium break-words",
                            task.status === "DONE" && "text-muted-foreground line-through decoration-subtle-foreground",
                          )}
                        >
                          {task.title}
                        </span>
                        <div className="-mt-1 -mr-1.5" draggable={false} onDragStart={(e) => e.preventDefault()}>
                          <TaskActionsMenu
                            task={task}
                            onEdit={() => m.setEditing(task)}
                            onDelete={() => m.setDeleting(task)}
                            onMove={(s) => persist(task.id, s, 0)}
                          />
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={task.priority} />
                        <DueLabel task={task} />
                      </div>
                      {task.project && (
                        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <ProjectDot color={task.project.color} />
                          {task.project.name}
                        </p>
                      )}
                    </article>
                  </li>
                ))}
                {isOver && tasks.length > 0 && over.index >= tasks.length && <span aria-hidden className="mx-1 h-0.5 rounded-full bg-primary" />}
                {/* Sempre montado: remover o alvo durante o arraste faz o navegador cancelar o drop. */}
                {tasks.length === 0 && (
                  <li
                    className={cn(
                      "grid flex-1 place-items-center rounded-md border border-dashed px-3 py-6 text-center text-xs transition-colors",
                      isOver ? "border-primary/60 text-primary" : "border-border text-subtle-foreground",
                    )}
                  >
                    {isOver ? "Solte para mover" : "Arraste tarefas para cá"}
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <TaskFormDialog open={!!m.editing} onOpenChange={(o) => !o && m.setEditing(null)} task={m.editing} projects={projects} />
      <ConfirmDelete
        open={!!m.deleting}
        onOpenChange={(o) => !o && m.setDeleting(null)}
        title={`Excluir "${m.deleting?.title ?? ""}"?`}
        description="Esta ação não pode ser desfeita."
        onConfirm={m.confirmDelete}
      />
    </>
  );
}
