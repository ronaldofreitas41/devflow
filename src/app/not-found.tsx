import Link from "next/link";
import { LogoMark } from "@/components/shared/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <LogoMark className="mx-auto size-9" />
        <p className="mt-6 font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Esta página não existe</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">O endereço pode ter mudado ou sido digitado errado.</p>
        <Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>
          Ir para o dashboard
        </Link>
      </div>
    </main>
  );
}
