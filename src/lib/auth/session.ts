import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { Role, users } from "@/lib/db/schema";

export type SessionData = {
  userId?: string;
  isLoggedIn: boolean;
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "dev-only-session-secret-change-me-32chars!!",
  cookieName: "aigov_cockpit_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  return user ?? null;
}

export function canWrite(role: Role): boolean {
  return role === "admin" || role === "governance_manager";
}

export function canCommittee(role: Role): boolean {
  return (
    role === "admin" ||
    role === "governance_manager" ||
    role === "committee_member"
  );
}

export function canSubmit(role: Role): boolean {
  return (
    role === "admin" ||
    role === "governance_manager" ||
    role === "submitter"
  );
}

export function isReadOnly(role: Role): boolean {
  return role === "executive" || role === "auditor";
}
