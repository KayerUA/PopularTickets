import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/adminSession";
import { getServiceSupabase } from "@/lib/supabase/admin";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const token = (await cookies()).get("admin_session")?.value;
  if (!(await verifyAdminToken(token))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return new NextResponse("eventId required", { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return new NextResponse("Supabase not configured", { status: 503 });
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id,created_at,buyer_name,email,phone,quantity,status,amount_grosze,p24_session_id,p24_order_id,tickets(id,ticket_number,used_at)"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const header = [
    "order_id",
    "created_at",
    "buyer_name",
    "email",
    "phone",
    "quantity",
    "status",
    "amount_grosze",
    "p24_session_id",
    "p24_order_id",
    "ticket_id",
    "ticket_number",
    "used_at",
  ];

  const lines: string[] = [header.join(",")];

  for (const o of orders ?? []) {
    const tickets = (o.tickets ?? []) as { id: string; ticket_number: string; used_at: string | null }[];
    if (!tickets.length) {
      lines.push(
        [
          o.id,
          o.created_at,
          o.buyer_name,
          o.email,
          o.phone ?? "",
          String(o.quantity),
          o.status,
          String(o.amount_grosze),
          o.p24_session_id,
          o.p24_order_id != null ? String(o.p24_order_id) : "",
          "",
          "",
          "",
        ]
          .map((c) => csvEscape(String(c)))
          .join(",")
      );
      continue;
    }
    for (const t of tickets) {
      lines.push(
        [
          o.id,
          o.created_at,
          o.buyer_name,
          o.email,
          o.phone ?? "",
          String(o.quantity),
          o.status,
          String(o.amount_grosze),
          o.p24_session_id,
          o.p24_order_id != null ? String(o.p24_order_id) : "",
          t.id,
          t.ticket_number,
          t.used_at ?? "",
        ]
          .map((c) => csvEscape(String(c)))
          .join(",")
      );
    }
  }

  const body = lines.join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${eventId}.csv"`,
    },
  });
}
