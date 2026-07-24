import { cookies } from "next/headers";
import { COOKIE_NAME, getSessionUser, type AdminRole } from "./auth";
import { getAdminRole } from "./db";

export async function currentUsername(): Promise<string | null> {
  const store = await cookies();
  return getSessionUser(store.get(COOKIE_NAME)?.value);
}

export async function currentUser(): Promise<{ username: string; role: AdminRole } | null> {
  const username = await currentUsername();
  if (!username) return null;
  const role = await getAdminRole(username);
  if (!role) return null;
  return { username, role };
}

export async function requireSuperadmin(): Promise<{ username: string; role: AdminRole } | null> {
  const user = await currentUser();
  return user && user.role === "superadmin" ? user : null;
}
