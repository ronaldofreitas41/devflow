import type { ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";

export const PROJECT_STATUS = ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const satisfies readonly ProjectStatus[];
export const TASK_STATUS = ["TODO", "IN_PROGRESS", "DONE"] as const satisfies readonly TaskStatus[];
export const TASK_PRIORITY = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const satisfies readonly TaskPriority[];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  ARCHIVED: "Arquivado",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const PROJECT_COLORS = [
  "#8b5cf6",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#84cc16",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
] as const;

export const TASKS_PAGE_SIZE = 10;
export const FOCUS_DEFAULT_MINUTES = 25;
export const MAX_REPORT_DAYS = 366;
