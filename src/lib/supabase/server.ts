import { cookies } from "next/headers";

import { getSupabaseEnv } from "./config";

async function loadSupabaseSSR() {
  try {
    const moduleName = "@supabase/" + "ssr";
    return await import(moduleName);
  } catch {
    return null;
  }
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const supabaseSSR = await loadSupabaseSSR();
  if (!supabaseSSR?.createServerClient) {
    throw new Error("Missing dependency: @supabase/ssr. Run npm install.");
  }

  return supabaseSSR.createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
