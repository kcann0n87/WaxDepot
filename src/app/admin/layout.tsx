import Link from "next/link";
import {
  ShieldCheck,
  Receipt,
  AlertTriangle,
  Package2,
  Users,
  Tag,
  ScrollText,
  Lightbulb,
  Mail,
} from "lucide-react";
import { requireAdminOrNotFound } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminOrNotFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3 rounded-md border border-amber-700/30 bg-amber-500/[0.04] px-4 py-2">
        <ShieldCheck size={14} className="text-amber-400" />
        <div className="text-xs text-white/70">
          Admin mode · Signed in as{" "}
          <span className="font-semibold text-white">{admin.username}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <aside>
          <nav className="rounded-xl border border-white/10 bg-[#101012] p-2">
            <NavLink href="/admin" icon={<ShieldCheck size={14} />} label="Overview" />
            <NavLink href="/admin/orders" icon={<Receipt size={14} />} label="Orders" />
            <NavLink
              href="/admin/disputes"
              icon={<AlertTriangle size={14} />}
              label="Disputes"
            />
            <NavLink
              href="/admin/catalog"
              icon={<Package2 size={14} />}
              label="Catalog"
            />
            <NavLink
              href="/admin/listings"
              icon={<Tag size={14} />}
              label="Listings"
            />
            <NavLink href="/admin/users" icon={<Users size={14} />} label="Users" />
            <NavLink
              href="/admin/invite"
              icon={<Mail size={14} />}
              label="Invite"
            />
            <NavLink
              href="/admin/feedback"
              icon={<Lightbulb size={14} />}
              label="Feedback"
            />
            <NavLink
              href="/admin/audit"
              icon={<ScrollText size={14} />}
              label="Audit log"
            />
          </nav>
          <p className="mt-3 px-2 text-[10px] leading-relaxed text-white/50">
            Every destructive action (refund, force-release, cancel) is logged in
            <code className="rounded bg-white/5 px-1 py-0.5 font-mono">admin_actions</code>.
          </p>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );
}
