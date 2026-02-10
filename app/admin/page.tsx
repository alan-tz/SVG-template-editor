import Link from "next/link";

import { SignOutButton } from "@/src/components/AuthActions";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="admin-layout">
      <section className="admin-card">
        <h1>Admin Console</h1>
        <p>Signed in as: {user?.email ?? "unknown"}</p>
        <p>
          This is the admin area. Next step is adding shared template management backed by
          Supabase tables/storage.
        </p>
        <div className="admin-actions">
          <Link href="/editor/default">Open Editor</Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
