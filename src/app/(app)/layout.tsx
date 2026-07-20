import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/triage";

  return (
    <AppShell user={user} pathname={pathname}>
      {children}
    </AppShell>
  );
}
