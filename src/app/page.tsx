import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  ensureDb();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "submitter") redirect("/self-service");
  if (user.role === "executive") redirect("/executive");
  redirect("/triage");
}
