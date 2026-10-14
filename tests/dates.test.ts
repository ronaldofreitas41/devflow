import { describe, expect, it } from "vitest";
import { addDays, dayKey, daysInRange, endOfDay, percentChange, previousRange, startOfDay, weekStart } from "@/lib/dates";

describe("datas com fuso horário", () => {
  it("meia-noite em São Paulo corresponde a 03:00 UTC", () => {
    expect(startOfDay("2026-10-14", "America/Sao_Paulo").toISOString()).toBe("2026-10-14T03:00:00.000Z");
    expect(endOfDay("2026-10-14", "America/Sao_Paulo").toISOString()).toBe("2026-10-15T02:59:59.999Z");
  });

  it("agrupa um instante no dia local, não no dia UTC", () => {
    // 01:30 UTC do dia 15 ainda é dia 14 em São Paulo
    expect(dayKey(new Date("2026-10-15T01:30:00Z"), "America/Sao_Paulo")).toBe("2026-10-14");
  });

  it("período anterior equivalente tem o mesmo tamanho e termina na véspera", () => {
    const prev = previousRange({ from: "2026-10-01", to: "2026-10-14" });
    expect(prev).toEqual({ from: "2026-09-17", to: "2026-09-30" });
    expect(daysInRange(prev)).toBe(14);
  });

  it("semana começa na segunda-feira", () => {
    expect(weekStart("2026-10-14")).toBe("2026-10-12"); // quarta → segunda
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // domingo → segunda anterior
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("variação percentual trata base zero", () => {
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 10)).toBe(-50);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(3, 0)).toBeNull();
  });
});
