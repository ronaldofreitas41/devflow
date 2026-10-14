import { z } from "zod";
import { addDays, daysInRange, isDayKey, type DateRange } from "@/lib/dates";
import { MAX_REPORT_DAYS } from "@/lib/constants";

export function parseReportQuery(
  raw: { from?: string; to?: string; projectId?: string },
  today: string,
): { range: DateRange; projectId: string | null } {
  const schema = z.object({
    from: z.string().refine(isDayKey).catch(addDays(today, -29)),
    to: z.string().refine(isDayKey).catch(today),
    projectId: z.string().max(64).catch("ALL"),
  });
  const q = schema.parse({ from: raw.from ?? "", to: raw.to ?? "", projectId: raw.projectId ?? "ALL" });
  let { from, to } = q;
  if (to > today) to = today;
  if (from > to) from = to;
  if (daysInRange({ from, to }) > MAX_REPORT_DAYS) from = addDays(to, -(MAX_REPORT_DAYS - 1));
  return { range: { from, to }, projectId: q.projectId === "ALL" || !q.projectId ? null : q.projectId };
}
