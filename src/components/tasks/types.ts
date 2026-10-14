import type { TaskPriority, TaskStatus } from "@prisma/client";

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD ou ""
  overdue: boolean;
  project: { id: string; name: string; color: string } | null;
}

export interface ProjectOption {
  id: string;
  name: string;
  color: string;
}
