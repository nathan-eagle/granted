"use client";

import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SessionState } from "@/lib/session-store";
import { useSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";

interface GrantSummary {
  id: string;
  name: string;
  updatedAt?: string;
}

const FETCH_OPTIONS: RequestInit = {
  headers: {
    "Cache-Control": "no-store",
  },
};

export default function AppHeader() {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();

  const [emailInput, setEmailInput] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [grants, setGrants] = useState<GrantSummary[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);

  const [switchingGrant, setSwitchingGrant] = useState(false);
  const [creatingGrant, setCreatingGrant] = useState(false);

  const activeGrantId = sessionState?.projectId ?? "";
  const refreshBootstrap = useCallback(async () => {
    setBootstrapLoading(true);
    try {
      const res = await fetch("/api/bootstrap", FETCH_OPTIONS);
      if (!res.ok) {
        throw new Error(`Bootstrap failed (${res.status})`);
      }
      const json = (await res.json()) as SessionState;
      setSessionState(json);
      if (json.appUserEmail) {
        setUserEmail(json.appUserEmail);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  const fetchGrants = useCallback(async () => {
    setGrantsLoading(true);
    setGrantsError(null);
    try {
      const res = await fetch("/api/grants", FETCH_OPTIONS);
      if (!res.ok) {
        throw new Error(`Failed to load grants (${res.status})`);
      }
      const json = (await res.json()) as { grants: GrantSummary[] };
      setGrants(json.grants);
    } catch (error) {
      console.error(error);
      setGrantsError("Unable to load grants.");
    } finally {
      setGrantsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void refreshBootstrap();

    void supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      const email = session?.user?.email ?? null;
      setUserEmail(email);
      if (email) {
        void fetchGrants();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      const email = session?.user?.email ?? null;
      setUserEmail(email);
      if (session) {
        void fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, session }),
        });
      }
      void refreshBootstrap();
      if (email) {
        void fetchGrants();
      } else {
        setGrants([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchGrants, refreshBootstrap, supabase.auth]);

  const handleSendMagicLink = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!emailInput.trim()) {
        setAuthError("Enter an email address to sign in.");
        return;
      }
      setSendingLink(true);
      setAuthError(null);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailInput.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          throw error;
        }
        setLinkSent(true);
      } catch (error) {
        console.error(error);
        setAuthError("Unable to send magic link. Please try again.");
      } finally {
        setSendingLink(false);
      }
    },
    [emailInput, supabase.auth],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setGrants([]);
    setUserEmail(null);
    setLinkSent(false);
    setEmailInput("");
    await refreshBootstrap();
    router.refresh();
  }, [refreshBootstrap, router, supabase.auth]);

  const handleCreateGrant = useCallback(async () => {
    if (creatingGrant) return;
    const name = window.prompt("Grant name", "Untitled grant");
    if (name === null) {
      return;
    }
    setCreatingGrant(true);
    try {
      const res = await fetch("/api/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        throw new Error(`Failed to create grant (${res.status})`);
      }
      await fetchGrants();
    } catch (error) {
      console.error(error);
      setGrantsError("Grant creation failed.");
    } finally {
      setCreatingGrant(false);
    }
  }, [creatingGrant, fetchGrants]);

  const handleGrantChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value;
      if (!nextId || nextId === activeGrantId) {
        return;
      }
      setSwitchingGrant(true);
      try {
        const res = await fetch("/api/use-grant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: nextId }),
        });
        if (!res.ok) {
          throw new Error(`Failed to switch grant (${res.status})`);
        }
        await refreshBootstrap();
        router.refresh();
      } catch (error) {
        console.error(error);
        setGrantsError("Could not switch grants.");
      } finally {
        setSwitchingGrant(false);
      }
    },
    [activeGrantId, refreshBootstrap, router],
  );

  const grantOptions = useMemo(() => {
    const all = [...grants];
    if (sessionState && !all.some((grant) => grant.id === sessionState.projectId)) {
      all.unshift({
        id: sessionState.projectId,
        name: sessionState.projectTitle,
      });
    }
    return all;
  }, [grants, sessionState]);

  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">{sessionState?.projectTitle ?? "Granted"}</h1>
        <p className="app-subtitle">
          Upload RFPs, chat through coverage, and export polished drafts without leaving this workspace.
        </p>
      </div>

      <div className="app-header-controls">
        {userEmail ? (
          <div className="auth-block">
            <span className="auth-email">{userEmail}</span>
            <button type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSendMagicLink}>
            <label htmlFor="auth-email">Sign in to manage grants</label>
            <div className="auth-form-row">
              <input
                id="auth-email"
                type="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="you@example.org"
                required
              />
              <button type="submit" disabled={sendingLink}>
                {sendingLink ? "Sending…" : "Email link"}
              </button>
            </div>
            {authError ? <p className="auth-error">{authError}</p> : null}
            {linkSent ? <p className="auth-success">Check your inbox for the sign-in link.</p> : null}
          </form>
        )}

        {userEmail ? (
          <div className="grant-switcher">
            <label htmlFor="grant-select">Grant workspace</label>
            <div className="grant-switcher-row">
              <select
                id="grant-select"
                value={activeGrantId}
                onChange={handleGrantChange}
                disabled={grantsLoading || switchingGrant || bootstrapLoading}
              >
                {grantOptions.map((grant) => (
                  <option key={grant.id} value={grant.id}>
                    {grant.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleCreateGrant} disabled={creatingGrant}>
                {creatingGrant ? "Creating…" : "New grant"}
              </button>
            </div>
            {grantsError ? <p className="auth-error">{grantsError}</p> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
