"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_COLORS, PROJECT_STATUS, PROJECT_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createProjectAction, updateProjectAction } from "@/server/actions/projects";
import { projectInputSchema, type ProjectInput } from "@/server/validators/project";

export interface ProjectFormValues extends ProjectInput {
  id?: string;
}

const EMPTY: ProjectInput = { name: "", description: "", color: PROJECT_COLORS[0], status: "ACTIVE", startDate: "", dueDate: "" };

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectFormValues | null;
}) {
  const router = useRouter();
  const editing = Boolean(project?.id);
  const form = useForm<ProjectInput>({ resolver: zodResolver(projectInputSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) form.reset(project ? { ...EMPTY, ...project } : EMPTY);
  }, [open, project, form]);

  async function onSubmit(values: ProjectInput) {
    const res = editing ? await updateProjectAction(project!.id, values) : await createProjectAction(values);
    if (!res.ok) {
      for (const [field, msgs] of Object.entries(res.fieldErrors ?? {})) {
        if (msgs?.[0]) form.setError(field as keyof ProjectInput, { message: msgs[0] });
      }
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "Projeto atualizado" : "Projeto criado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            <DialogDescription>O progresso é calculado automaticamente pelas tarefas concluídas.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <FormField id="p-name" label="Nome" error={errors.name?.message}>
              <Input id="p-name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
            </FormField>
            <FormField id="p-desc" label="Descrição" error={errors.description?.message}>
              <Textarea id="p-desc" rows={3} {...form.register("description")} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="p-status" label="Status" error={errors.status?.message}>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="p-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {PROJECT_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 text-[13px] font-medium text-foreground/90">Cor</legend>
                <Controller
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <div role="radiogroup" aria-label="Cor do projeto" className="flex flex-wrap gap-1.5">
                      {PROJECT_COLORS.map((c) => {
                        const selected = field.value === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={c}
                            onClick={() => field.onChange(c)}
                            className={cn(
                              "grid size-7 place-items-center rounded-md ring-offset-2 ring-offset-popover transition-transform hover:scale-105",
                              selected && "ring-2 ring-foreground/70",
                            )}
                            style={{ background: c }}
                          >
                            {selected && <Check className="size-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </fieldset>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="p-start" label="Início" error={errors.startDate?.message}>
                <Input id="p-start" type="date" {...form.register("startDate")} />
              </FormField>
              <FormField id="p-due" label="Prazo (opcional)" error={errors.dueDate?.message}>
                <Input id="p-due" type="date" aria-invalid={!!errors.dueDate} {...form.register("dueDate")} />
              </FormField>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {editing ? "Salvar alterações" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
