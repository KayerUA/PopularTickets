"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqualString } from "@/lib/security";
import { signAdminToken } from "@/lib/adminSession";

const COOKIE = "admin_session";

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD не настроен");

  if (password.length !== expected.length || !timingSafeEqualString(password, expected)) {
    throw new Error("Неверный пароль");
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
