/**
 * Utilitários de data cientes de fuso horário.
 *
 * O servidor (ex.: Vercel) roda em UTC, mas "hoje", "esta semana" e o agrupamento
 * por dia precisam seguir o fuso do usuário. Trabalhamos com "chaves de dia"
 * (YYYY-MM-DD) e convertemos para instantes UTC apenas nas bordas.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";

const DAY_MS = 86_400_000;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DayKey = string;

export interface DateRange {
  from: DayKey; // inclusivo
  to: DayKey; // inclusivo
}

export function isDayKey(value: string): value is DayKey {
  if (!KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const keyFormatters = new Map<string, Intl.DateTimeFormat>();
function keyFormatter(tz: string) {
  let f = keyFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    keyFormatters.set(tz, f);
  }
  return f;
}

/** Dia (no fuso informado) em que o instante cai. */
export function dayKey(date: Date, tz = APP_TIMEZONE): DayKey {
  return keyFormatter(tz).format(date);
}

/** Diferença (ms) entre o horário local do fuso e UTC naquele instante. */
export function tzOffsetMs(date: Date, tz = APP_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instante UTC da meia-noite local do dia informado. */
export function startOfDay(key: DayKey, tz = APP_TIMEZONE): Date {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(y, m - 1, d);
  let result = guess - tzOffsetMs(new Date(guess), tz);
  // Reajusta caso a virada de horário de verão caia entre o palpite e o resultado.
  result = guess - tzOffsetMs(new Date(result), tz);
  return new Date(result);
}

/** Último milissegundo do dia local — usado para prazos ("até o fim do dia"). */
export function endOfDay(key: DayKey, tz = APP_TIMEZONE): Date {
  return new Date(startOfDay(addDays(key, 1), tz).getTime() - 1);
}

export function addDays(key: DayKey, amount: number): DayKey {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + amount)).toISOString().slice(0, 10);
}

/** Número de dias entre duas chaves, inclusivo. */
export function daysInRange(range: DateRange): number {
  const a = Date.parse(`${range.from}T00:00:00Z`);
  const b = Date.parse(`${range.to}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS) + 1;
}

export function eachDay(range: DateRange): DayKey[] {
  const n = daysInRange(range);
  return Array.from({ length: Math.max(n, 0) }, (_, i) => addDays(range.from, i));
}

/** Segunda-feira da semana do dia informado. */
export function weekStart(key: DayKey): DayKey {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(key, -((dow + 6) % 7));
}

/** Período imediatamente anterior com a mesma quantidade de dias. */
export function previousRange(range: DateRange): DateRange {
  const n = daysInRange(range);
  return { from: addDays(range.from, -n), to: addDays(range.from, -1) };
}

/** Converte um intervalo de dias em intervalo semiaberto de instantes [start, end). */
export function rangeBounds(range: DateRange, tz = APP_TIMEZONE) {
  return { start: startOfDay(range.from, tz), end: startOfDay(addDays(range.to, 1), tz) };
}

/** Variação percentual; `null` quando não há base de comparação. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const shortDate = new Map<string, Intl.DateTimeFormat>();
/** "14 out." */
export function formatDayShort(key: DayKey) {
  let f = shortDate.get("s");
  if (!f) {
    f = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
    shortDate.set("s", f);
  }
  return f.format(new Date(`${key}T12:00:00Z`));
}

/** "14/10/2026" */
export function formatDayKey(key: DayKey) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTime(date: Date, tz = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function weekdayShort(key: DayKey) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${key}T12:00:00Z`))
    .replace(".", "");
}

/** "2h 05min", "45min" */
export function formatDuration(seconds: number) {
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export function toHours(seconds: number) {
  return Math.round((seconds / 3600) * 10) / 10;
}
