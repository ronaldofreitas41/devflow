"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReportData } from "@/server/services/report-calc";
import { buildReportPdf } from "./pdf";

export function ExportPdfButton({ report, projectLabel, userName }: { report: ReportData; projectLabel: string; userName: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      onClick={async () => {
        setBusy(true);
        try {
          await buildReportPdf(report, { projectLabel, userName });
          toast.success("PDF exportado");
        } catch (e) {
          console.error(e);
          toast.error("Não foi possível gerar o PDF.");
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      Exportar PDF
    </Button>
  );
}
