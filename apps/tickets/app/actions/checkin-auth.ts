"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CHECKIN_SESSION_COOKIE,
  checkinAuthRequired,
  readCheckinPasswordEnv,
  signCheckinSessionToken,
} from "@/lib/checkinSession";
import { timingSafeEqualString } from "@/lib/security";

export async function checkinLogin(formData: FormData) {
  if (!checkinAuthRequired()) {
    redirect("/check-in");
  }

  const operatorToken = String(formData.get("checkinPassword") || formData.get("operatorToken") || "");
  const expected = readCheckinPasswordEnv();
  if (!expected) {
    redirect("/check-in?error=unconfigured");
  }

  if (operatorToken.length !== expected.length || !timingSafeEqualString(operatorToken, expected)) {
    redirect("/check-in?error=bad_code");
  }

  let sessionToken: string;
  try {
    sessionToken = await signCheckinSessionToken();
  } catch {
    redirect("/check-in?error=jwt");
  }

  (await cookies()).set(CHECKIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/check-in",
    maxAge: 60 * 60 * 8,
  });

  redirect("/check-in");
}

export async function checkinLogout() {
  (await cookies()).delete({ name: CHECKIN_SESSION_COOKIE, path: "/check-in" });
  redirect("/check-in");
}
