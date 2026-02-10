import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnvOptional } from "./config";

async function loadSupabaseSSR() {
  try {
    const moduleName = "@supabase/" + "ssr";
    return await import(moduleName);
  } catch {
    return null;
  }
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnvOptional();
  if (!env) {
    return { user: null, response };
  }
  const { supabaseUrl, supabaseAnonKey } = env;
  const supabaseSSR = await loadSupabaseSSR();
  if (!supabaseSSR?.createServerClient) {
    return { user: null, response };
  }

  const supabase = supabaseSSR.createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response };
}
