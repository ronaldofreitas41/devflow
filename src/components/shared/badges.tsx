import type { ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABEL, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PRIORITY_TONE = { LOW: "neutral", MEDIUM: "info", HIGH: "warning", URGENT: "danger" } as const;
const STATUS_TONE = { TODO: "neutral", IN_PROGRESS: "primary", DONE: "success" } as const;
const PROJECT_TONE = { ACTIVE: "primary", PAUSED: "warning", COMPLETED: "success", ARCHIVED: "neutral" } as const;

/** Barras de sinal: a prioridade é legível também sem cor. */
export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const level = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }[priority];
  return (
    <Badge tone={PRIORITY_TONE[priority]} className={className}>
      <span aria-hidden className="flex items-end gap-px">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("w-[2px] rounded-full bg-current", i > level && "opacity-25")} style={{ height: 3 + i * 2 }} />
        ))}
      </span>
      {TASK_PRIORITY_LABEL[priority]}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{TASK_STATUS_LABEL[status]}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={PROJECT_TONE[status]}>{PROJECT_STATUS_LABEL[status]}</Badge>;
}

export function ProjectDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-[3px]", className)} style={{ background: color }} />;
}
