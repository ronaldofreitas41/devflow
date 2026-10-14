import type { ReportData } from "@/server/services/report-calc";
import { formatDayKey, formatDuration } from "@/lib/dates";
import { TASK_PRIORITY_LABEL } from "@/lib/constants";

/**
 * Gera o PDF a partir do MESMO objeto `ReportData` renderizado na tela —
 * por construção, os números são idênticos aos exibidos.
 */
export async function buildReportPdf(report: ReportData, meta: { projectLabel: string; userName: string }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const violet: [number, number, number] = [109, 92, 230];
  const ink: [number, number, number] = [24, 24, 32];
  const muted: [number, number, number] = [110, 112, 125];

  const generated = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: report.timezone,
  }).format(new Date(report.generatedAt));

  // Cabeçalho
  doc.setFillColor(...violet);
  doc.rect(0, 0, W, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ink);
  doc.text("Relatório de produtividade", M, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(`${formatDayKey(report.range.from)} a ${formatDayKey(report.range.to)}  |  ${meta.projectLabel}`, M, 66);
  doc.text(`Gerado em ${generated} por ${meta.userName}`, M, 80);
  doc.text("DevFlow", W - M, 48, { align: "right" });

  // Indicadores
  const prev = report.previous;
  const pct = (v: number | null) => (v === null ? "novo" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}%`);
  const kpis = [
    { label: "Concluídas", value: String(report.totals.completed), prev: String(prev.completed), delta: pct(report.change.completed) },
    { label: "Pendentes", value: String(report.totals.pending), prev: String(prev.pending), delta: pct(report.change.pending) },
    { label: "Atrasadas", value: String(report.totals.overdue), prev: String(prev.overdue), delta: pct(report.change.overdue) },
    { label: "Horas focadas", value: formatDuration(report.totals.focusSeconds), prev: formatDuration(prev.focusSeconds), delta: pct(report.change.focusSeconds) },
  ];
  const boxW = (W - M * 2 - 12 * 3) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (boxW + 12);
    const y = 100;
    doc.setDrawColor(225, 225, 232);
    doc.setFillColor(248, 248, 251);
    doc.roundedRect(x, y, boxW, 70, 6, 6, "FD");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(k.label, x + 10, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(...ink);
    doc.text(k.value, x + 10, y + 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`Anterior: ${k.prev}  (${k.delta})`, x + 10, y + 58);
  });

  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(
    `Período anterior equivalente: ${formatDayKey(report.previousRange.from)} a ${formatDayKey(report.previousRange.to)}. Taxa de conclusão: ${report.totals.completionRate.toLocaleString("pt-BR")}%  |  Sessões de foco: ${report.totals.sessions}.`,
    M,
    190,
    { maxWidth: W - M * 2 },
  );

  const tableStyles = {
    theme: "grid" as const,
    styles: { fontSize: 9, cellPadding: 5, textColor: ink, lineColor: [225, 225, 232] as [number, number, number] },
    headStyles: { fillColor: violet, textColor: 255, fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: [248, 248, 251] as [number, number, number] },
    margin: { left: M, right: M },
  };

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    ...tableStyles,
    startY: 210,
    head: [["Prioridade", "Concluídas", "Pendentes"]],
    body: report.priority.map((p) => [TASK_PRIORITY_LABEL[p.priority], p.completed, p.pending]),
  });

  autoTable(doc, {
    ...tableStyles,
    startY: lastY() + 18,
    head: [["Projeto", "Tarefas concluídas", "Horas focadas"]],
    body: report.topProjects.length
      ? report.topProjects.map((p) => [p.name, p.completed, formatDuration(p.focusSeconds)])
      : [["Sem atividade em projetos no período", "", ""]],
  });

  if (report.overdueTasks.length) {
    autoTable(doc, {
      ...tableStyles,
      startY: lastY() + 18,
      head: [["Tarefa atrasada", "Prioridade", "Prazo"]],
      body: report.overdueTasks.map((t) => [t.title, TASK_PRIORITY_LABEL[t.priority], formatDayKey(t.dueDay)]),
    });
  }

  autoTable(doc, {
    ...tableStyles,
    startY: lastY() + 18,
    head: [["Dia", "Tarefas concluídas", "Minutos de foco"]],
    body: report.daily.map((d) => [formatDayKey(d.day), d.completed, d.focusMinutes]),
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`Página ${i} de ${pages}`, W - M, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  doc.save(`devflow-relatorio-${report.range.from}_${report.range.to}.pdf`);
}
