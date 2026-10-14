"use client";

import type { TaskStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TASK_STATUS_LABEL } from "@/lib/constants";
import { deleteTaskAction, setTaskStatusAction } from "@/server/actions/tasks";
import type { TaskRow } from "./types";

/** Estado compartilhado entre lista e quadro: diálogos de edição/exclusão e mudança de status. */
export function useTaskMutations() {
  const router = useRouter();
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function changeStatus(task: TaskRow, status: TaskStatus) {
    const res = await setTaskStatusAction(task.id, status);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(status === "DONE" ? "Tarefa concluída" : `Movida para ${TASK_STATUS_LABEL[status]}`);
    router.refresh();
    return true;
  }

  async function confirmDelete() {
    const res = await deleteTaskAction(deleting!.id);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success("Tarefa excluída");
    router.refresh();
    return true;
  }

  return { editing, setEditing, deleting, setDeleting, creating, setCreating, changeStatus, confirmDelete };
}
