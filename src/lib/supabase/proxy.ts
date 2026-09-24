import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const privateRoute = pathname.startsWith("/painel") || pathname === "/onboarding";
  const authRoute = ["/login", "/cadastro", "/esqueci-a-senha"].includes(pathname);

  if (privateRoute && !data.user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoute && data.user) {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = "/painel";
    panelUrl.search = "";
    return NextResponse.redirect(panelUrl);
  }

  return response;
}
