"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqualString } from "@/lib/security";
import { signAdminToken } from "@/lib/adminSession";

const COOKIE = "admin_session";

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    redirect("/admin/login?error=admin_password");
  }

  const jwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 16) {
    redirect("/admin/login?error=admin_jwt");
  }

  if (password.length !== expected.length || !timingSafeEqualString(password, expected)) {
    redirect("/admin/login?error=bad_password");
  }

  const token = await signAdminToken();

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/admin");
}

export async function adminLogout() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}
