"use client";

import type { ProjectStatus } from "@prisma/client";
import { CalendarClock, FolderKanban, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ProjectStatusBadge } from "@/components/shared/badges";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { formatDayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { deleteProjectAction } from "@/server/actions/projects";
import { ProjectFormDialog, type ProjectFormValues } from "./project-form-dialog";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  taskCount: number;
  doneCount: number;
  progress: number;
  overdue: boolean;
}

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Novo projeto
      </Button>
      <ProjectFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ProjectsGrid({ projects, filtered }: { projects: ProjectCardData[]; filtered: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProjectFormValues | null>(null);
  const [deleting, setDeleting] = useState<ProjectCardData | null>(null);
  const [creating, setCreating] = useState(false);

  if (projects.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderKanban}
          title={filtered ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
          description={
            filtered ? "Ajuste a busca ou os filtros para ver outros projetos." : "Crie um projeto para agrupar tarefas e acompanhar o progresso."
          }
          action={
            !filtered && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Criar primeiro projeto
              </Button>
            )
          }
        />
        <ProjectFormDialog open={creating} onOpenChange={setCreating} />
      </>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <li key={p.id} className="group relative flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong">
            <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r-full" style={{ background: p.color }} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/tasks?projectId=${p.id}`}
                  className="block truncate font-medium after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
                >
                  {p.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <ProjectStatusBadge status={p.status} />
                  {p.dueDate && (
                    <span className={cn("inline-flex items-center gap-1 text-xs", p.overdue ? "text-destructive" : "text-muted-foreground")}>
                      <CalendarClock className="size-3.5" aria-hidden />
                      {p.overdue ? "Venceu " : "Até "}
                      {formatDayKey(p.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="relative z-10 -mr-1.5 -mt-1" aria-label={`Ações do projeto ${p.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      setEditing({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        color: p.color,
                        status: p.status,
                        startDate: p.startDate,
                        dueDate: p.dueDate,
                      })
                    }
                  >
                    <Pencil /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(p)}>
                    <Trash2 /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
              {p.description || <span className="text-subtle-foreground">Sem descrição</span>}
            </p>

            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground tabular">
                  {p.doneCount}/{p.taskCount} tarefas
                </span>
                <span className="font-medium tabular">{p.progress}%</span>
              </div>
              <Progress value={p.progress} color={p.color} label={`Progresso de ${p.name}`} />
            </div>
          </li>
        ))}
      </ul>

      <ProjectFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} project={editing} />
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Excluir "${deleting?.name ?? ""}"?`}
        description="As tarefas e sessões de foco do projeto serão mantidas, apenas sem vínculo. Esta ação não pode ser desfeita."
        onConfirm={async () => {
          const res = await deleteProjectAction(deleting!.id);
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success("Projeto excluído");
          router.refresh();
          return true;
        }}
      />
    </>
  );
}
