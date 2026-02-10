import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/src/lib/supabase/middleware";
import { getSupabaseEnvOptional } from "@/src/lib/supabase/config";

function isAdminRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null) {
  if (!user) {
    return false;
  }
  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;
  return appRole === "admin" || userRole === "admin";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!getSupabaseEnvOptional()) {
    return NextResponse.next({ request });
  }

  const { user, response } = await updateSupabaseSession(request);

  const isProtectedPath = pathname.startsWith("/editor") || pathname.startsWith("/admin");
  const isLoginPath = pathname.startsWith("/login");

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !isAdminRole(user)) {
    const url = request.nextUrl.clone();
    url.pathname = "/editor/default";
    return NextResponse.redirect(url);
  }

  if (isLoginPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminRole(user) ? "/admin" : "/editor/default";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
