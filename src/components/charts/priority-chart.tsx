"use client";

import type { TaskPriority } from "@prisma/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TASK_PRIORITY_LABEL } from "@/lib/constants";
import { axisProps, gridProps } from "./chart-theme";
import { ChartTooltip, LegendItem } from "./chart-tooltip";

export function PriorityChart({ data }: { data: { priority: TaskPriority; completed: number; pending: number }[] }) {
  const rows = [...data].reverse().map((d) => ({ ...d, label: TASK_PRIORITY_LABEL[d.priority] }));
  return (
    <figure>
      <div className="mb-3 flex flex-wrap gap-4">
        <LegendItem color="var(--chart-3)" label="Concluídas" />
        <LegendItem color="var(--border-strong)" label="Pendentes" />
      </div>
      <div className="h-[200px]" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...gridProps} vertical horizontal={false} />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis type="category" dataKey="label" {...axisProps} width={64} />
            <Tooltip cursor={{ fill: "var(--surface-hover)", opacity: 0.6 }} content={<ChartTooltip />} />
            <Bar dataKey="completed" name="Concluídas" stackId="a" fill="var(--chart-3)" maxBarSize={18} />
            <Bar dataKey="pending" name="Pendentes" stackId="a" fill="var(--border-strong)" radius={[0, 3, 3, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {rows.map((r) => `${r.label}: ${r.completed} concluídas, ${r.pending} pendentes`).join("; ")}
      </figcaption>
    </figure>
  );
}
