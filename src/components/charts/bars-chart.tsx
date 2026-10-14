"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisProps, gridProps } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";

/** Série única em barras. A última barra (período atual) pode ser destacada. */
export function BarsChart({
  data,
  dataKey,
  name,
  unit,
  color = "var(--chart-2)",
  highlightLast,
  height = 220,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  name: string;
  unit?: string;
  color?: string;
  highlightLast?: boolean;
  height?: number;
}) {
  const fmt = (v: number) => `${v.toLocaleString("pt-BR")}${unit ? ` ${unit}` : ""}`;
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -18 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={10} />
            <YAxis {...axisProps} width={40} />
            <Tooltip cursor={{ fill: "var(--surface-hover)", opacity: 0.6 }} content={<ChartTooltip formatters={{ [dataKey]: fmt }} />} />
            <Bar dataKey={dataKey} name={name} radius={[3, 3, 0, 0]} maxBarSize={32}>
              {data.map((_, i) => (
                <Cell key={i} fill={color} fillOpacity={highlightLast && i !== data.length - 1 ? 0.45 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{data.map((d) => `${d.label}: ${fmt(Number(d[dataKey]))}`).join("; ")}</figcaption>
    </figure>
  );
}
