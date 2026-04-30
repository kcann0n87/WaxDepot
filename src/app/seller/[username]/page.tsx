import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductImage } from "@/components/product-image";
import { FollowButton } from "@/components/follow-button";
import { formatUSDFull } from "@/lib/utils";
import type { Sport, Sku } from "@/lib/data";

type SkuJoin = {
  id: string;
  slug: string;
  year: number;
  brand: string;
  sport: Sport;
  product: string;
  set_name: string;
  release_date: string;
  description: string | null;
  image_url: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
};

type ListingRow = {
  id: string;
  price_cents: number;
  shipping_cents: number;
  quantity: number;
  status: string;
  created_at: string;
  sku: SkuJoin | SkuJoin[] | null;
};

function rowToSku(row: SkuJoin): Sku {
  return {
    id: row.id,
    slug: row.slug,
    year: row.year,
    brand: row.brand,
    sport: row.sport,
    set: row.set_name,
    product: row.product,
    releaseDate: row.release_date,
    description: row.description ?? "",
    imageUrl: row.image_url ?? undefined,
    gradient: [row.gradient_from ?? "#475569", row.gradient_to ?? "#0f172a"],
  };
}

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, location, avatar_color, is_verified, is_seller, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const [{ data: listings }, salesCountRes, { data: reviewRows }] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, price_cents, shipping_cents, quantity, status, created_at, sku:skus!listings_sku_id_fkey(id, slug, year, brand, sport, product, set_name, release_date, description, image_url, gradient_from, gradient_to)",
      )
      .eq("seller_id", profile.id)
      .eq("status", "Active")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", profile.id)
      .in("status", ["Delivered", "Released", "Completed"]),
    supabase
      .from("reviews")
      .select(
        "id, stars, verdict, text, seller_reply, seller_reply_at, created_at, reviewer:profiles!reviews_reviewer_id_fkey(username, display_name), sku:skus!reviews_sku_id_fkey(slug, year, brand, product)",
      )
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const totalSales = salesCountRes.count ?? 0;

  type RawReview = {
    id: string;
    stars: number;
    verdict: "positive" | "neutral" | "negative";
    text: string | null;
    seller_reply: string | null;
    seller_reply_at: string | null;
    created_at: string;
    reviewer: { username: string; display_name: string } | { username: string; display_name: string }[] | null;
    sku: { slug: string; year: number; brand: string; product: string } | { slug: string; year: number; brand: string; product: string }[] | null;
  };

  const reviews = ((reviewRows ?? []) as unknown as RawReview[]).map((r) => {
    const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer;
    const skuMeta = Array.isArray(r.sku) ? r.sku[0] : r.sku;
    return {
      id: r.id,
      stars: r.stars,
      verdict: r.verdict,
      text: r.text,
      sellerReply: r.seller_reply,
      sellerReplyAt: r.seller_reply_at,
      createdAt: r.created_at,
      reviewerUsername: reviewer?.username ?? "anonymous",
      reviewerDisplayName: reviewer?.display_name ?? "Anonymous",
      skuSlug: skuMeta?.slug,
      skuTitle: skuMeta ? `${skuMeta.year} ${skuMeta.brand} ${skuMeta.product}` : null,
    };
  });

  const reviewCount = reviews.length;
  const avgStars =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviewCount : null;
  const positivePct =
    reviewCount > 0
      ? (reviews.filter((r) => r.verdict === "positive").length / reviewCount) * 100
      : null;

  const sellerListings = ((listings ?? []) as unknown as ListingRow[])
    .map((row) => {
      const skuRel = Array.isArray(row.sku) ? row.sku[0] : row.sku;
      if (!skuRel) return null;
      return {
        sku: rowToSku(skuRel),
        priceCents: row.price_cents,
        shippingCents: row.shipping_cents,
        quantity: row.quantity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const joinedDate = new Date(profile.created_at);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
      >
        <ArrowLeft size={14} /> Back to marketplace
      </Link>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101012]">
        <div
          className="h-32 md:h-40"
          style={{
            background: `linear-gradient(135deg, ${gradientFromUsername(profile.username)})`,
          }}
        />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <Avatar name={profile.display_name} large />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-black tracking-tight text-white">
                  {profile.display_name}
                </h1>
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300">
                    <CheckCircle2 size={12} />
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/50">
                <span className="font-mono">@{profile.username}</span>
                {profile.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {profile.location}
                  </span>
                )}
                <span>Joined {joinedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/account/messages/new?to=${profile.username}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-300"
              >
                <MessageCircle size={14} />
                Message
              </Link>
              <FollowButton username={profile.username} />
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-3xl text-sm text-white/60">{profile.bio}</p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={<Package size={14} />} label="Total sales" value={totalSales.toLocaleString()} />
            <Stat
              icon={<Package size={14} />}
              label="Active listings"
              value={String(sellerListings.length)}
            />
            <Stat
              icon={<Star size={14} />}
              label="Rating"
              value={
                avgStars !== null
                  ? `${avgStars.toFixed(1)}★ · ${positivePct?.toFixed(0)}%`
                  : "—"
              }
            />
            <Stat
              icon={<ShieldCheck size={14} />}
              label="Member since"
              value={joinedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            />
          </div>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-black text-white">Active listings</h2>
            <p className="text-sm text-white/50">
              {sellerListings.length}{" "}
              {sellerListings.length === 1 ? "product" : "products"} available
            </p>
          </div>
        </div>

        {sellerListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
            <Package className="mx-auto text-white/40" size={32} />
            <p className="font-display mt-3 text-sm font-bold text-white">No active listings</p>
            <p className="mt-1 text-sm text-white/50">
              {profile.display_name} doesn&apos;t have anything listed right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {sellerListings.slice(0, 12).map(({ sku, priceCents, quantity }) => (
              <Link
                key={sku.id}
                href={`/product/${sku.slug}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#101012] transition hover:border-amber-400/30"
              >
                <ProductImage sku={sku} size="card" className="aspect-[4/5]" />
                <div className="flex flex-1 flex-col p-3">
                  <div className="line-clamp-2 text-sm font-semibold text-white transition group-hover:text-amber-300">
                    {sku.year} {sku.brand} {sku.product}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                        Their ask
                      </div>
                      <div className="font-display text-base font-black text-amber-400">
                        {formatUSDFull(priceCents / 100)}
                      </div>
                    </div>
                    <div className="text-xs text-white/50">
                      {quantity} {quantity === 1 ? "left" : "listed"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3">
          <h2 className="font-display text-lg font-black text-white">Recent feedback</h2>
          <p className="text-sm text-white/50">
            {reviewCount === 0
              ? "Reviews show up after buyers confirm orders."
              : `${reviewCount} buyer ${reviewCount === 1 ? "review" : "reviews"}`}
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-white/50">
            {profile.display_name} doesn&apos;t have reviews yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-white/10 bg-[#101012] p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={r.reviewerDisplayName} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-white">
                          {r.reviewerDisplayName}
                        </div>
                        <span className="text-[11px] text-white/40">@{r.reviewerUsername}</span>
                        <VerdictTag verdict={r.verdict} />
                      </div>
                      <div className="text-xs text-white/40">
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <Stars stars={r.stars} />
                    {r.skuSlug && r.skuTitle && (
                      <Link
                        href={`/product/${r.skuSlug}`}
                        className="mt-1 block text-xs text-white/50 transition hover:text-amber-300"
                      >
                        on {r.skuTitle}
                      </Link>
                    )}
                    {r.text && (
                      <p className="mt-2 text-sm whitespace-pre-line text-white/80">{r.text}</p>
                    )}
                    {r.sellerReply && (
                      <div className="mt-3 rounded-md border-l-2 border-amber-700/40 bg-amber-500/10 px-3 py-2">
                        <div className="text-xs font-bold text-white/80">
                          {profile.display_name} replied
                        </div>
                        <p className="mt-0.5 text-sm whitespace-pre-line text-white/80">
                          {r.sellerReply}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#101012] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-white/50 uppercase">
        <span className="text-white/40">{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-display text-base font-black text-white">{value}</div>
    </div>
  );
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initial = name[0]?.toUpperCase() ?? "?";
  const colors = [
    "from-emerald-400 to-emerald-600",
    "from-sky-400 to-sky-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-violet-400 to-violet-600",
    "from-cyan-400 to-cyan-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const size = large
    ? "h-24 w-24 text-3xl ring-4 ring-[#0a0a0b]"
    : "h-10 w-10 text-base";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-lg ${color} ${size}`}
    >
      {initial}
    </div>
  );
}

function VerdictTag({ verdict }: { verdict: "positive" | "neutral" | "negative" }) {
  const cfg = {
    positive: "bg-emerald-500/15 text-emerald-300",
    neutral: "bg-amber-500/15 text-amber-300",
    negative: "bg-rose-500/15 text-rose-300",
  }[verdict];
  const label = verdict[0].toUpperCase() + verdict.slice(1);
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${cfg}`}>
      {label}
    </span>
  );
}

function Stars({ stars }: { stars: number }) {
  return (
    <div className="mt-1 flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= stars ? "fill-amber-400 text-amber-400" : "text-white/20"}
        />
      ))}
    </div>
  );
}

function gradientFromUsername(u: string) {
  const palettes = [
    "#4f46e5, #7c3aed",
    "#0ea5e9, #06b6d4",
    "#dc2626, #f59e0b",
    "#16a34a, #84cc16",
    "#7c3aed, #ec4899",
    "#0c4a6e, #0891b2",
  ];
  return palettes[u.charCodeAt(0) % palettes.length];
}
