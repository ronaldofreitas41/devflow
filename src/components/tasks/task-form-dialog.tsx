"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ProjectDot } from "@/components/shared/badges";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TASK_PRIORITY, TASK_PRIORITY_LABEL, TASK_STATUS, TASK_STATUS_LABEL } from "@/lib/constants";
import { createTaskAction, updateTaskAction } from "@/server/actions/tasks";
import { taskInputSchema, type TaskInput } from "@/server/validators/task";
import type { ProjectOption, TaskRow } from "./types";

const NONE = "__none__";
const EMPTY: TaskInput = { title: "", description: "", projectId: "", priority: "MEDIUM", status: "TODO", dueDate: "" };

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  projects,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow | null;
  projects: ProjectOption[];
  defaults?: Partial<TaskInput>;
}) {
  const router = useRouter();
  const editing = Boolean(task);
  const form = useForm<TaskInput>({ resolver: zodResolver(taskInputSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (!open) return;
    form.reset(
      task
        ? {
            title: task.title,
            description: task.description,
            projectId: task.project?.id ?? "",
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
          }
        : { ...EMPTY, ...defaults },
    );
  }, [open, task, defaults, form]);

  // Um projeto arquivado vinculado à tarefa continua visível na lista.
  const options = task?.project && !projects.some((p) => p.id === task.project!.id) ? [...projects, task.project] : projects;

  async function onSubmit(values: TaskInput) {
    const res = editing ? await updateTaskAction(task!.id, values) : await createTaskAction(values);
    if (!res.ok) {
      for (const [field, msgs] of Object.entries(res.fieldErrors ?? {})) {
        if (msgs?.[0]) form.setError(field as keyof TaskInput, { message: msgs[0] });
      }
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "Tarefa atualizada" : "Tarefa criada");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
            <DialogDescription>Defina prioridade e prazo para que ela apareça no lugar certo.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <FormField id="t-title" label="Título" error={errors.title?.message}>
              <Input id="t-title" autoFocus aria-invalid={!!errors.title} {...form.register("title")} />
            </FormField>
            <FormField id="t-desc" label="Descrição" error={errors.description?.message}>
              <Textarea id="t-desc" rows={3} {...form.register("description")} />
            </FormField>
            <FormField id="t-project" label="Projeto" error={errors.projectId?.message}>
              <Controller
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                    <SelectTrigger id="t-project">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem projeto</SelectItem>
                      {options.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <ProjectDot color={p.color} />
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="t-priority" label="Prioridade">
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="t-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITY.map((p) => (
                          <SelectItem key={p} value={p}>
                            {TASK_PRIORITY_LABEL[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="t-status" label="Status">
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="t-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {TASK_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="t-due" label="Vencimento" error={errors.dueDate?.message}>
                <Input id="t-due" type="date" {...form.register("dueDate")} />
              </FormField>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {editing ? "Salvar alterações" : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
