import { getServerSession } from "next-auth";

import { authOptions } from "@/server/authOptions";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function getActiveOrgId(): Promise<string> {
  const session = await getServerSession(authOptions);
  return session?.activeOrgId || "";
}
