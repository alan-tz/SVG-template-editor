"use client";

import { getSupabaseEnv } from "./config";

async function loadSupabaseSSR() {
  try {
    const moduleName = "@supabase/" + "ssr";
    return await import(moduleName);
  } catch {
    return null;
  }
}

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  throw new Error(
    `Supabase browser client unavailable. Install @supabase/ssr first. URL: ${supabaseUrl}, key set: ${Boolean(supabaseAnonKey)}`,
  );
}

export async function createSupabaseBrowserClientAsync() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const supabaseSSR = await loadSupabaseSSR();
  if (!supabaseSSR?.createBrowserClient) {
    throw new Error("Missing dependency: @supabase/ssr. Run npm install.");
  }
  return supabaseSSR.createBrowserClient(supabaseUrl, supabaseAnonKey);
}
