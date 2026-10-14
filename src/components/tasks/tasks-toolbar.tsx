"use client";

import { Columns3, List, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchFilter, SelectFilter } from "@/components/shared/url-filters";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITY, TASK_PRIORITY_LABEL, TASK_STATUS, TASK_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TaskFormDialog } from "./task-form-dialog";
import type { ProjectOption } from "./types";

export function NewTaskButton({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const projectId = params.get("projectId");
  const defaults = projectId && projects.some((p) => p.id === projectId) ? { projectId } : undefined;
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Nova tarefa
      </Button>
      <TaskFormDialog open={open} onOpenChange={setOpen} projects={projects} defaults={defaults} />
    </>
  );
}

export function ViewToggle() {
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view") === "board" ? "board" : "list";
  const href = (v: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    if (v === "list") next.delete("view");
    else next.set("view", v);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const item = (v: "list" | "board", label: string, Icon: typeof List) => (
    <Link
      href={href(v)}
      aria-current={view === v ? "page" : undefined}
      scroll={false}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[13px] transition-colors",
        view === v ? "bg-surface-hover text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </Link>
  );
  return (
    <nav aria-label="Modo de visualização" className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {item("list", "Lista", List)}
      {item("board", "Quadro", Columns3)}
    </nav>
  );
}

export function TaskFilters({ projects, view }: { projects: ProjectOption[]; view: "list" | "board" }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
      <SearchFilter placeholder="Buscar tarefas" className="sm:col-span-2 lg:min-w-56 lg:flex-1" />
      {view === "list" && (
        <SelectFilter
          name="status"
          label="Filtrar por status"
          options={[
            { value: "ALL", label: "Todos os status" },
            { value: "OPEN", label: "Abertas" },
            ...TASK_STATUS.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] })),
          ]}
        />
      )}
      <SelectFilter
        name="priority"
        label="Filtrar por prioridade"
        options={[{ value: "ALL", label: "Todas as prioridades" }, ...TASK_PRIORITY.map((p) => ({ value: p, label: TASK_PRIORITY_LABEL[p] }))]}
      />
      <SelectFilter
        name="projectId"
        label="Filtrar por projeto"
        options={[
          { value: "ALL", label: "Todos os projetos" },
          { value: "NONE", label: "Sem projeto" },
          ...projects.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />
      {view === "list" && (
        <SelectFilter
          name="sort"
          label="Ordenar por"
          defaultValue="createdAt"
          options={[
            { value: "createdAt", label: "Mais recentes" },
            { value: "dueDate", label: "Vencimento" },
            { value: "priority", label: "Prioridade" },
            { value: "title", label: "Título" },
          ]}
        />
      )}
    </div>
  );
}
