"use client";

import { useCallback, useEffect, useState } from "react";

type Report = {
  id: string;
  reason: string;
  status: "PENDING" | "ACTIONED" | "DISMISSED";
  createdAt: string;
  reported: { id: string; isGuest: boolean; deviceFingerprint: string | null };
  reporter: { id: string };
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("bounce_admin_token");
    if (stored) {
      setToken(stored);
      setSaved(true);
    }
  }, []);

  const load = useCallback(async (t: string) => {
    setError(null);
    const res = await fetch("/api/admin/reports", { headers: { "x-admin-token": t } });
    if (!res.ok) {
      setError("Invalid token or request failed.");
      return;
    }
    const data = await res.json();
    setReports(data.reports);
  }, []);

  useEffect(() => {
    if (saved && token) load(token);
  }, [saved, token, load]);

  async function act(reportId: string, action: "ban" | "dismiss") {
    await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ reportId, action }),
    });
    load(token);
  }

  if (!saved) {
    return (
      <main className="mx-auto max-w-sm px-6 py-24">
        <h1 className="font-display text-xl font-bold text-ink">Admin</h1>
        <p className="mt-2 text-sm text-ink-muted">Paste the admin token from your server&rsquo;s environment.</p>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          className="mt-4 w-full rounded-full border border-line bg-surface-2 px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => {
            localStorage.setItem("bounce_admin_token", token);
            setSaved(true);
          }}
          className="mt-3 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
        >
          Continue
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-xl font-bold text-ink">Reports queue</h1>
      {error && <p className="mt-3 text-sm text-accent-ink">{error}</p>}
      <div className="mt-6 flex flex-col gap-3">
        {reports?.map((r) => (
          <div key={r.id} className="glass flex items-center justify-between rounded-xl2 p-4">
            <div>
              <p className="font-mono text-xs text-ink-muted">{new Date(r.createdAt).toLocaleString()}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{r.reason.replaceAll("_", " ")}</p>
              <p className="mt-1 font-mono text-xs text-ink-muted">
                reported: {r.reported.id.slice(0, 10)}… · status: {r.status}
              </p>
            </div>
            {r.status === "PENDING" && (
              <div className="flex gap-2">
                <button
                  onClick={() => act(r.id, "ban")}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white"
                >
                  Ban
                </button>
                <button
                  onClick={() => act(r.id, "dismiss")}
                  className="rounded-full border border-line px-4 py-2 text-xs text-ink-muted hover:text-ink"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ))}
        {reports?.length === 0 && <p className="text-sm text-ink-muted">No reports yet.</p>}
      </div>
    </main>
  );
}
