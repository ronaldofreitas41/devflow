"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDuration } from "@/lib/dates";
import { axisProps, gridProps } from "./chart-theme";
import { ChartTooltip, LegendItem } from "./chart-tooltip";

export interface DailyPoint {
  label: string;
  completed: number;
  focusMinutes: number;
}

/** Tarefas concluídas (barras) e minutos de foco (linha) por dia, com eixos independentes. */
export function ProductivityChart({ data, height = 240 }: { data: DailyPoint[]; height?: number }) {
  const dense = data.length > 14;
  return (
    <figure>
      <div className="mb-3 flex flex-wrap gap-4">
        <LegendItem color="var(--chart-1)" label="Tarefas concluídas" />
        <LegendItem color="var(--chart-2)" label="Minutos de foco" shape="line" />
      </div>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -18 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} interval={dense ? "preserveStartEnd" : 0} minTickGap={12} />
            <YAxis yAxisId="tasks" {...axisProps} allowDecimals={false} width={40} />
            <YAxis yAxisId="focus" orientation="right" {...axisProps} allowDecimals={false} width={36} hide={data.every((d) => d.focusMinutes === 0)} />
            <Tooltip
              cursor={{ fill: "var(--surface-hover)", opacity: 0.6 }}
              content={<ChartTooltip formatters={{ focusMinutes: (v) => formatDuration(v * 60) }} />}
            />
            <Bar yAxisId="tasks" dataKey="completed" name="Tarefas concluídas" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Line
              yAxisId="focus"
              type="linear"
              dataKey="focusMinutes"
              name="Minutos de foco"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={dense ? false : { r: 2.5, fill: "var(--chart-2)", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${d.label}: ${d.completed} tarefas, ${d.focusMinutes} minutos de foco`).join("; ")}
      </figcaption>
    </figure>
  );
}
