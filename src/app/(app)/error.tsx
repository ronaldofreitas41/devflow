"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";
import { PageContainer } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <PageContainer>
      <div className="mx-auto mt-16 max-w-md text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Não foi possível carregar esta página</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Verifique sua conexão e tente novamente. Se persistir, recarregue o navegador.</p>
        <Button className="mt-6" variant="secondary" onClick={reset}>
          <RotateCw /> Tentar novamente
        </Button>
      </div>
    </PageContainer>
  );
}
