"use server";

import { createClient } from "@/lib/supabase/server";

export type JoinWaitlistResult = {
  ok?: boolean;
  alreadyOnList?: boolean;
  error?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(formData: FormData): Promise<JoinWaitlistResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const source = String(formData.get("source") || "coming-soon").trim().slice(0, 64);

  if (!email) return { error: "Enter your email." };
  if (!EMAIL_RE.test(email)) return { error: "That doesn't look like a valid email." };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Local dev without Supabase wired — still pretend to succeed so the UI works.
    return { ok: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert({ email, source });
    if (error) {
      // 23505 = unique_violation. Treat "already signed up" as success.
      if (error.code === "23505") return { ok: true, alreadyOnList: true };
      console.error("joinWaitlist insert error:", error);
      return { error: "Something went wrong. Please try again." };
    }
    return { ok: true };
  } catch (e) {
    console.error("joinWaitlist failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}
