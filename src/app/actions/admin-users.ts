"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { serviceRoleClient } from "@/lib/supabase/admin";

type Result = { ok?: boolean; error?: string };

export async function adminBanUser(
  userId: string,
  reason: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };
  if (admin.id === userId) return { error: "Can't ban yourself." };
  if (!reason.trim()) return { error: "Reason required." };

  const sb = serviceRoleClient();
  const { error } = await sb
    .from("profiles")
    .update({
      banned_at: new Date().toISOString(),
      ban_reason: reason.trim(),
    })
    .eq("id", userId);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "ban_user", "user", userId, { reason });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function adminUnbanUser(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };

  const sb = serviceRoleClient();
  const { error } = await sb
    .from("profiles")
    .update({ banned_at: null, ban_reason: null })
    .eq("id", userId);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "unban_user", "user", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function adminSetSellerTier(
  userId: string,
  tier: "Starter" | "Pro" | "Elite" | "Apex",
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };
  if (!["Starter", "Pro", "Elite", "Apex"].includes(tier))
    return { error: "Invalid tier." };

  const sb = serviceRoleClient();
  const { error } = await sb
    .from("profiles")
    .update({ seller_tier: tier })
    .eq("id", userId);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "set_seller_tier", "user", userId, { tier });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function adminToggleAdmin(
  userId: string,
  makeAdmin: boolean,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };
  if (admin.id === userId && !makeAdmin)
    return { error: "Can't demote yourself." };

  const sb = serviceRoleClient();
  const { error } = await sb
    .from("profiles")
    .update({ is_admin: makeAdmin })
    .eq("id", userId);
  if (error) return { error: error.message };

  await logAdminAction(
    admin.id,
    makeAdmin ? "promote_admin" : "demote_admin",
    "user",
    userId,
  );
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function adminDelistListing(
  listingId: string,
  reason: string,
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Forbidden" };
  if (!reason.trim()) return { error: "Reason required." };

  const sb = serviceRoleClient();
  const { error } = await sb
    .from("listings")
    .update({ status: "Expired" })
    .eq("id", listingId);
  if (error) return { error: error.message };

  await logAdminAction(admin.id, "delist_listing", "listing", listingId, {
    reason,
  });
  revalidatePath("/admin/listings");
  return { ok: true };
}
