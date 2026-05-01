"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart, groupBySeller, type CartItem } from "@/lib/cart";
import { skus } from "@/lib/data";
import { formatSkuTitle, formatUSD, formatUSDFull } from "@/lib/utils";
import { SkuThumb } from "./sku-thumb";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, hydrated, itemCount, subtotal, shipping, tax, total, updateQty, remove } = useCart();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("waxdepot:cart-open", onOpen);
    return () => window.removeEventListener("waxdepot:cart-open", onOpen);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape so keyboard users can dismiss the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-md p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
        aria-label="Cart"
      >
        <ShoppingBag size={18} />
        {hydrated && itemCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-white">
            {itemCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex h-screen" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
          <div className="flex-1 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <aside className="flex h-screen w-full max-w-md flex-col border-l border-white/10 bg-[#101012] shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
                  <ShoppingBag size={12} />
                  Cart
                </div>
                <h2 id="cart-drawer-title" className="font-display mt-0.5 text-xl font-black tracking-tight text-white">
                  Your cart
                </h2>
                <p className="text-xs text-white/50">
                  {itemCount > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Empty"}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-white/60 transition hover:bg-white/5 hover:text-white"
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {!hydrated ? (
                <div className="space-y-3 p-5">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-lg bg-white/5" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-700/30 bg-amber-500/10 text-amber-400">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="font-display mt-4 text-lg font-black text-white">Cart is empty</p>
                  <p className="mt-1 text-xs text-white/50">
                    Add boxes from any product page to get started.
                  </p>
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="mt-4 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
                  >
                    Browse marketplace
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {groupBySeller(items).map(([seller, sellerItems]) => (
                    <li key={seller}>
                      <div className="bg-[#101012]/[0.02] px-5 py-2 text-[11px] font-semibold tracking-wider text-white/60">
                        Sold by <span className="text-white">{seller}</span>
                      </div>
                      {sellerItems.map((it) => (
                        <CartRow
                          key={it.id}
                          item={it}
                          onUpdateQty={(q) => updateQty(it.id, q)}
                          onRemove={() => remove(it.id)}
                          onLinkClick={() => setOpen(false)}
                        />
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {hydrated && items.length > 0 && (
              <footer className="border-t border-white/5 bg-[#0a0a0b] p-5">
                <dl className="space-y-1.5 text-sm">
                  <Row label="Subtotal" value={formatUSDFull(subtotal)} />
                  <Row label="Shipping" value={shipping === 0 ? "Free" : formatUSDFull(shipping)} />
                  <Row label="Sales tax (est)" value={formatUSDFull(tax)} />
                  <div className="my-2 border-t border-white/5" />
                  <Row label="Total" value={formatUSDFull(total)} bold />
                </dl>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="mt-4 flex w-full items-center justify-between rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 font-bold text-white shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
                >
                  <span>Checkout</span>
                  <span>{formatUSD(total)}</span>
                </Link>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/50">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  Buyer Protection on every order · payment held in escrow
                </div>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function CartRow({
  item,
  onUpdateQty,
  onRemove,
  onLinkClick,
}: {
  item: CartItem;
  onUpdateQty: (q: number) => void;
  onRemove: () => void;
  onLinkClick: () => void;
}) {
  const sku = skus.find((s) => s.id === item.skuId);
  if (!sku) return null;
  return (
    <div className="flex gap-3 px-5 py-3">
      <Link
        href={`/product/${sku.slug}`}
        onClick={onLinkClick}
        className="block h-16 w-12 shrink-0 overflow-hidden rounded border border-white/10"
      >
        <SkuThumb sku={sku} className="h-full w-full" alt={formatSkuTitle(sku)} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/product/${sku.slug}`}
          onClick={onLinkClick}
          className="line-clamp-2 text-sm font-semibold text-white transition hover:text-amber-300"
        >
          {formatSkuTitle(sku)}
        </Link>
        <div className="mt-0.5 text-xs text-white/60">
          {item.shipping === 0 ? "Free shipping" : `${formatUSD(item.shipping)} shipping`}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-white/10 bg-white/5">
            <button
              onClick={() => onUpdateQty(item.qty - 1)}
              className="px-2 py-1 text-white/50 transition hover:text-white"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <span className="px-2 text-xs font-semibold text-white">{item.qty}</span>
            <button
              onClick={() => onUpdateQty(item.qty + 1)}
              className="px-2 py-1 text-white/50 transition hover:text-white"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>
          <button
            onClick={onRemove}
            className="ml-auto inline-flex items-center gap-1 text-xs text-white/60 transition hover:text-rose-400"
          >
            <Trash2 size={12} />
            Remove
          </button>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-base font-black text-amber-400">
          {formatUSD(item.price * item.qty)}
        </div>
        {item.qty > 1 && (
          <div className="text-[11px] text-white/60">{formatUSD(item.price)} ea</div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-bold text-white" : "text-white/60"}>{label}</dt>
      <dd className={bold ? "font-display text-base font-black text-amber-400" : "font-semibold text-white"}>
        {value}
      </dd>
    </div>
  );
}
