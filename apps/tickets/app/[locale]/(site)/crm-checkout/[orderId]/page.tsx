import { notFound } from "next/navigation";
import { requireServiceSupabase } from "@/lib/supabase/admin";
import { crmP24Url } from "@/lib/crmCheckout";

export const dynamic = "force-dynamic";

export default async function CrmCheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = requireServiceSupabase();
  const { data: order } = await supabase
    .from("crm_checkout_orders")
    .select("description,amount_grosze,currency,status,p24_token")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || !order.p24_token || order.status !== "pending") notFound();
  const amount = new Intl.NumberFormat("pl-PL", { style: "currency", currency: order.currency }).format(order.amount_grosze / 100);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 py-16">
      <section className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-7 text-center shadow-2xl">
        <p className="mb-3 text-sm uppercase tracking-[0.18em] text-white/55">PopularCRM · płatność</p>
        <h1 className="font-display text-3xl leading-tight text-white">{order.description}</h1>
        <p className="mt-5 text-2xl font-semibold text-white">{amount}</p>
        <p className="mt-5 text-sm leading-6 text-white/65">Bezpieczna płatność przez Przelewy24.</p>
        <a className="mt-7 inline-flex rounded-full bg-[#e8794e] px-7 py-3 font-semibold text-[#170c0b] transition hover:bg-[#f58a60]" href={crmP24Url(order.p24_token)}>
          Zapłać przez Przelewy24
        </a>
      </section>
    </main>
  );
}
