import { notFound, redirect } from "next/navigation";
import { requireServiceSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CrmCheckoutThanksPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = requireServiceSupabase();
  const { data: order } = await supabase.from("crm_checkout_orders").select("return_url").eq("id", orderId).maybeSingle();
  if (!order?.return_url) notFound();
  redirect(order.return_url);
}
