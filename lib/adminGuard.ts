import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/adminSession";

export async function requireAdmin(): Promise<void> {
  const c = await cookies();
  const ok = await verifyAdminToken(c.get("admin_session")?.value);
  if (!ok) {
    throw new Error("Нет доступа");
  }
}
