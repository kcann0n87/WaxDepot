import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Routes that REQUIRE auth (existing): redirect anon users here back to /login.
const PROTECTED_PREFIXES = ["/account", "/sell", "/cart", "/admin"];

// Routes always reachable by anyone, even with the beta gate ON. Everything
// else gets redirected to /coming-soon for anon visitors.
//
// While beta-gated we're invite-only — /signup is intentionally NOT public.
// Invitees get accounts provisioned manually (or via emailed magic links)
// and reach the site through /login. Re-add "/signup" here when launching.
const ALWAYS_PUBLIC_PREFIXES = [
  "/coming-soon",
  "/login",
  "/forgot",
  "/reset",
  "/auth",
  "/api",
];

const ALWAYS_PUBLIC_EXACT = new Set([
  "/opengraph-image",
  "/twitter-image",
  "/icon",
  "/apple-icon",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
]);

// Beta-gate toggle. Default: ON. Flip the gate off for public launch by setting
//   NEXT_PUBLIC_BETA_MODE=false
// in Vercel and redeploying. No code change needed.
const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE !== "false";

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAlwaysPublic(pathname: string) {
  if (ALWAYS_PUBLIC_EXACT.has(pathname)) return true;
  return ALWAYS_PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // We only need the user lookup if either gate could trigger.
  const needsUser = BETA_MODE
    ? !isAlwaysPublic(pathname)
    : isProtected(pathname);
  if (!needsUser) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // BETA GATE: anon users hitting any non-public route → /coming-soon.
  if (BETA_MODE && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/coming-soon";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Auth gate for protected routes (also active when beta mode is off).
  if (isProtected(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and image optimization, all other routes refresh session.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
