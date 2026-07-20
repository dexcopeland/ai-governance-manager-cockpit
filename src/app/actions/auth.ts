"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ensureDb } from "@/lib/db/ensure";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";

export async function loginAsUser(userId: string) {
  ensureDb();
  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new Error("User not found");
  }
  const session = await getSession();
  session.userId = user.id;
  session.isLoggedIn = true;
  await session.save();
  await recordAudit({
    entityType: "session",
    entityId: user.id,
    action: "login",
    actorId: user.id,
    after: { role: user.role },
  });
  if (user.role === "submitter") redirect("/self-service");
  if (user.role === "executive") redirect("/executive");
  redirect("/triage");
}

export async function logoutAction() {
  const session = await getSession();
  const actorId = session.userId;
  session.destroy();
  if (actorId) {
    await recordAudit({
      entityType: "session",
      entityId: actorId,
      action: "logout",
      actorId,
    });
  }
  redirect("/login");
}
