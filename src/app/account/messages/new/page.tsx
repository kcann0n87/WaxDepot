import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "@/app/actions/messages";
import { NewMessageForm } from "./new-message-form";

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; order?: string; sku?: string }>;
}) {
  const { to, order, sku } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/account/messages/new${to ? `?to=${to}` : ""}`);

  if (!to) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-amber-700/40 bg-amber-500/10 p-8 text-center">
          <MessageCircle className="mx-auto text-amber-400" size={32} />
          <h1 className="font-display mt-3 text-lg font-bold text-white">
            Pick someone to message
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Open this page from a seller&apos;s profile or order page.
          </p>
          <Link
            href="/account/messages"
            className="mt-4 inline-block rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  // Look up the target profile to confirm it exists + show their display name.
  const { data: target } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("username", to.toLowerCase())
    .maybeSingle();

  // Look up SKU info from a slug or UUID (skip if not provided).
  let skuInfo: { slug: string; year: number; brand: string; product: string } | null = null;
  if (sku) {
    const { data } = await supabase
      .from("skus")
      .select("slug, year, brand, product")
      .eq("id", sku)
      .maybeSingle();
    if (data) skuInfo = data;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
        <Link href="/account/messages" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowLeft size={14} /> Messages
        </Link>
        <span>/</span>
        <span className="text-white">New message</span>
      </div>
      <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
        Message {target?.display_name ?? to}
      </h1>
      <p className="mt-1 text-sm text-white/50">
        {target ? `Start a new conversation with @${target.username}.` : "User not found."}
      </p>

      {skuInfo && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="text-xs font-semibold text-white/50">About</div>
          <Link
            href={`/product/${skuInfo.slug}`}
            className="line-clamp-1 text-sm font-bold text-white transition hover:text-amber-300"
          >
            {skuInfo.year} {skuInfo.brand} {skuInfo.product}
          </Link>
        </div>
      )}

      {target && (
        <NewMessageForm
          to={target.username}
          targetDisplayName={target.display_name}
          orderId={order}
          skuId={sku}
          startAction={startConversation}
          subjectHint={
            order
              ? `Order ${order}`
              : skuInfo
                ? `${skuInfo.year} ${skuInfo.brand} ${skuInfo.product}`
                : `Message to ${target.username}`
          }
          initialDraft={
            order
              ? `Hi ${target.display_name}, quick question about order ${order}: `
              : skuInfo
                ? `Hi ${target.display_name}, interested in your ${skuInfo.year} ${skuInfo.brand} ${skuInfo.product} — `
                : ""
          }
        />
      )}
    </div>
  );
}
