"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClientAsync } from "@/src/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        try {
          const supabase = await createSupabaseBrowserClientAsync();
          await supabase.auth.signOut();
          router.push("/login");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
