import { cn } from "@/lib/utils";

/** Marca: dois traços que se encontram — fluxo de trabalho convergindo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <rect width="24" height="24" rx="6" fill="var(--primary)" />
      <path d="M7 7.5h4.5a4.5 4.5 0 0 1 0 9H7" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16.8" cy="12" r="1.6" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && <span className="text-[15px] font-semibold tracking-tight">DevFlow</span>}
    </span>
  );
}
