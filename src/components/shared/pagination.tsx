import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass = buttonVariants({ variant: "secondary", size: "sm" });
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="tabular">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={linkClass} scroll={false}>
            <ChevronLeft /> <span className="max-sm:sr-only">Anterior</span>
          </Link>
        ) : (
          <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-disabled>
            <ChevronLeft /> <span className="max-sm:sr-only">Anterior</span>
          </span>
        )}
        <span className="tabular px-1 text-foreground">
          {page}/{pageCount}
        </span>
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} className={linkClass} scroll={false}>
            <span className="max-sm:sr-only">Próxima</span> <ChevronRight />
          </Link>
        ) : (
          <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-disabled>
            <span className="max-sm:sr-only">Próxima</span> <ChevronRight />
          </span>
        )}
      </div>
    </nav>
  );
}
