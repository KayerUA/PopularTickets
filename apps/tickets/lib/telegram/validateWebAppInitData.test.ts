import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { validateTelegramWebAppInitData } from "@/lib/telegram/validateWebAppInitData";

function signInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateTelegramWebAppInitData", () => {
  it("accepts valid initData", () => {
    const token = "123456:ABC-DEF";
    const initData = signInitData(
      {
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: 42, first_name: "Test" }),
      },
      token,
    );
    const user = validateTelegramWebAppInitData(initData, token);
    expect(user?.userId).toBe(42);
  });

  it("rejects tampered hash", () => {
    const token = "123456:ABC-DEF";
    const initData = signInitData(
      {
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: 42 }),
      },
      token,
    );
    const bad = initData.replace("hash=", "hash=x");
    expect(validateTelegramWebAppInitData(bad, token)).toBeNull();
  });
});
