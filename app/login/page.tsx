"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClientAsync } from "@/src/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/editor/default";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <main className="auth-layout">
      <form
        className="auth-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage(null);
          try {
            const supabase = await createSupabaseBrowserClientAsync();

            if (mode === "signup") {
              const { error } = await supabase.auth.signUp({ email, password });
              if (error) {
                throw error;
              }
              setMessage("Account created. Check your email to confirm if required.");
            } else {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) {
                throw error;
              }
              router.push(nextPath);
              router.refresh();
            }
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Authentication failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Framekit Login</h1>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <div className="auth-actions">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={mode === "signin" ? "active-mode" : undefined}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={mode === "signup" ? "active-mode" : undefined}
          >
            Create account
          </button>
        </div>

        <button type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        {message ? <p className="auth-message">{message}</p> : null}
      </form>
    </main>
  );
}
