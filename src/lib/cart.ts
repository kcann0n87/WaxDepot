"use client";

import { useEffect, useState } from "react";

const KEY = "waxdepot:cart";

export type CartItem = {
  id: string;
  skuId: string;
  listingId: string;
  seller: string;
  sellerRating: number;
  price: number;
  shipping: number;
  qty: number;
  addedAt: number;
};

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("waxdepot:cart-change"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read());
    setHydrated(true);
    const onChange = () => setItems(read());
    window.addEventListener("waxdepot:cart-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("waxdepot:cart-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = (item: Omit<CartItem, "id" | "addedAt">) => {
    const current = read();
    const existing = current.find((i) => i.listingId === item.listingId);
    const next = existing
      ? current.map((i) => (i.listingId === item.listingId ? { ...i, qty: i.qty + item.qty } : i))
      : [
          ...current,
          { ...item, id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: Date.now() },
        ];
    setItems(next);
    write(next);
  };

  const remove = (id: string) => {
    const next = read().filter((i) => i.id !== id);
    setItems(next);
    write(next);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return remove(id);
    const next = read().map((i) => (i.id === id ? { ...i, qty } : i));
    setItems(next);
    write(next);
  };

  const clear = () => {
    setItems([]);
    write([]);
  };

  const itemCount = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = items.reduce((s, i) => s + i.shipping, 0);
  const tax = Math.round(subtotal * 0.07 * 100) / 100;
  const total = subtotal + shipping + tax;

  return { items, hydrated, add, remove, updateQty, clear, itemCount, subtotal, shipping, tax, total };
}

export function groupBySeller(items: CartItem[]) {
  const groups: Record<string, CartItem[]> = {};
  for (const item of items) {
    if (!groups[item.seller]) groups[item.seller] = [];
    groups[item.seller].push(item);
  }
  return Object.entries(groups);
}
