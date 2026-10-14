import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";

async function RootRedirect() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
  return null;
}

export default function Home() {
  return (
    <Suspense>
      <RootRedirect />
    </Suspense>
  );
}
