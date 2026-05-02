"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2, Upload } from "lucide-react";
import {
  adminCreateSku,
  adminDeleteSku,
  adminUpdateSku,
  adminUploadSkuImage,
} from "@/app/actions/admin";

type SkuFormValues = {
  slug?: string;
  year: number | "";
  brand: string;
  set_name: string;
  product: string;
  sport: "NBA" | "MLB" | "NFL" | "NHL";
  release_date: string;
  description: string;
  image_url: string;
  gradient_from: string;
  gradient_to: string;
};

export function SkuForm({
  initial,
  skuId,
}: {
  initial?: Partial<SkuFormValues>;
  skuId?: string;
}) {
  const router = useRouter();
  const [vals, setVals] = useState<SkuFormValues>({
    slug: initial?.slug ?? "",
    year: initial?.year ?? new Date().getFullYear(),
    brand: initial?.brand ?? "",
    set_name: initial?.set_name ?? "",
    product: initial?.product ?? "Hobby Box",
    sport: (initial?.sport as SkuFormValues["sport"]) ?? "MLB",
    release_date: initial?.release_date ?? "",
    description: initial?.description ?? "",
    image_url: initial?.image_url ?? "",
    gradient_from: initial?.gradient_from ?? "#475569",
    gradient_to: initial?.gradient_to ?? "#0f172a",
  });
  const [pending, start] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof SkuFormValues>(k: K, v: SkuFormValues[K]) =>
    setVals((p) => ({ ...p, [k]: v }));

  const submit = () => {
    setErr(null);
    if (!vals.brand || !vals.set_name || !vals.product || !vals.sport || !vals.release_date) {
      setErr("brand, set, product, sport, release date required.");
      return;
    }
    if (!skuId && !vals.slug) {
      setErr("slug required for new SKUs.");
      return;
    }
    const payload = {
      year: Number(vals.year),
      brand: vals.brand,
      set_name: vals.set_name,
      product: vals.product,
      sport: vals.sport,
      release_date: vals.release_date,
      description: vals.description,
      gradient_from: vals.gradient_from,
      gradient_to: vals.gradient_to,
    };
    start(async () => {
      const result = skuId
        ? await adminUpdateSku(skuId, { ...payload, image_url: vals.image_url || null })
        : await adminCreateSku({ slug: vals.slug ?? "", ...payload, image_url: vals.image_url || undefined });
      if (result.error) setErr(result.error);
      else router.push("/admin/catalog");
    });
  };

  const remove = () => {
    if (!skuId) return;
    if (!confirm("Delete this SKU? Refused if any listings reference it.")) return;
    start(async () => {
      const result = await adminDeleteSku(skuId);
      if (result.error) setErr(result.error);
      else router.push("/admin/catalog");
    });
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    setUploadMsg(null);

    const slug = (vals.slug ?? "").trim().toLowerCase();
    if (!slug) {
      setErr("Enter a slug first — the file is named after it.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      setErr("Slug must be lowercase letters, numbers, hyphens.");
      return;
    }

    const fd = new FormData();
    fd.set("file", file);
    fd.set("slug", slug);
    if (skuId) fd.set("skuId", skuId);

    startUpload(async () => {
      const result = await adminUploadSkuImage(fd);
      if (result.error) {
        setErr(result.error);
        return;
      }
      const data = result.data as { publicUrl?: string } | undefined;
      if (data?.publicUrl) {
        setVals((p) => ({ ...p, image_url: data.publicUrl! }));
        setUploadMsg(
          skuId
            ? "Uploaded and saved to this SKU."
            : "Uploaded. Click Save to attach to the new SKU.",
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  return (
    <div className="space-y-4">
      <Field label="Slug" hint="lowercase-with-hyphens, immutable after create">
        <input
          disabled={!!skuId}
          value={vals.slug ?? ""}
          onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
          placeholder="2025-topps-chrome-football-hobby-box"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Year">
          <input
            type="number"
            value={vals.year}
            onChange={(e) =>
              set("year", e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </Field>
        <Field label="Sport">
          <select
            value={vals.sport}
            onChange={(e) => set("sport", e.target.value as SkuFormValues["sport"])}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="NBA">NBA</option>
            <option value="MLB">MLB</option>
            <option value="NFL">NFL</option>
            <option value="NHL">NHL</option>
          </select>
        </Field>
        <Field label="Brand">
          <input
            value={vals.brand}
            onChange={(e) => set("brand", e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            placeholder="Topps"
          />
        </Field>
        <Field label="Product">
          <select
            value={vals.product}
            onChange={(e) => set("product", e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option>Hobby Box</option>
            <option>Jumbo Box</option>
            <option>Mega Box</option>
            <option>Value Box</option>
            <option>Blaster Box</option>
            <option>Hanger Box</option>
            <option>Booster Box</option>
            <option>Elite Trainer Box</option>
            <option>Hobby Case</option>
            <option>Inner Case</option>
          </select>
        </Field>
      </div>

      <Field label="Set name" hint="e.g. 'Chrome', 'Prizm', 'Bowman'">
        <input
          value={vals.set_name}
          onChange={(e) => set("set_name", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          placeholder="Chrome"
        />
      </Field>

      <Field label="Release date" hint="YYYY-MM-DD">
        <input
          type="date"
          value={vals.release_date}
          onChange={(e) => set("release_date", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
      </Field>

      {/* Image: preview + upload + URL paste. The file input uploads to
          Supabase Storage immediately (server action) and writes the
          public URL into the image_url field below. The URL field stays
          editable so admins can also paste a /products/<slug>.jpg path
          or a third-party CDN URL. */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-white/80">Image</span>
        <div className="flex items-start gap-3">
          <div
            className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-white/[0.02]"
            style={{
              background: vals.image_url
                ? "transparent"
                : `linear-gradient(135deg, ${vals.gradient_from}, ${vals.gradient_to})`,
            }}
          >
            {vals.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={vals.image_url}
                src={vals.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageOff size={20} className="text-white/40" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Upload size={12} />
                )}
                {uploading ? "Uploading…" : vals.image_url ? "Replace image" : "Upload image"}
              </button>
              {vals.image_url && (
                <button
                  type="button"
                  onClick={() => set("image_url", "")}
                  className="text-[11px] font-semibold text-white/60 transition hover:text-rose-300"
                >
                  Clear
                </button>
              )}
              <span className="text-[10px] text-white/40">
                JPG · PNG · WebP · max 5MB
              </span>
            </div>
            <input
              value={vals.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white"
              placeholder="https://… or /products/<slug>.jpg"
            />
            {uploadMsg && (
              <p className="text-[11px] text-emerald-300">{uploadMsg}</p>
            )}
          </div>
        </div>
      </div>

      <Field label="Description">
        <textarea
          value={vals.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Gradient from (hex)">
          <input
            value={vals.gradient_from}
            onChange={(e) => set("gradient_from", e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono"
          />
        </Field>
        <Field label="Gradient to (hex)">
          <input
            value={vals.gradient_to}
            onChange={(e) => set("gradient_to", e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono"
          />
        </Field>
      </div>

      {err && <p className="text-xs text-rose-300">{err}</p>}

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
        >
          {pending ? "Saving…" : skuId ? "Save changes" : "Create SKU"}
        </button>
        {skuId && (
          <button
            onClick={remove}
            disabled={pending}
            className="rounded-md border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
          >
            Delete SKU
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-white/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-white/50">{hint}</span>}
    </label>
  );
}
