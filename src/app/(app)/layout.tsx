import { cookies } from "next/headers";
import { Suspense } from "react";
import { AppShell, SIDEBAR_COOKIE } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  return (
    <AppShell user={{ name: user.name, email: user.email }} defaultCollapsed={collapsed}>
      {children}
    </AppShell>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-60 border-r border-border bg-surface md:block" />
      <div className="flex-1 p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-6 h-32 w-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
