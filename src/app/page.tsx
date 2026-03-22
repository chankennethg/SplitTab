"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    const res = await createGroup({ name: trimmed });
    setLoading(false);

    if (!res.success || !res.data) {
      setError(res.error ?? "Failed to create group");
      return;
    }

    router.push(`/groups/${res.data.id}`);
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            Split<span className="logo-accent">Tab</span>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: "40px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Split bills with friends
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
            Create a group, add expenses, and see who owes what.
            <br />
            Share the link — anyone with it can view and edit.
          </p>
        </div>

        <div className="card">
          <div className="card-title">Create a new group</div>
          <form onSubmit={handleCreate}>
            <div className="input-row">
              <input
                className="input"
                type="text"
                placeholder="e.g. Weekend trip, Roommates..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                autoFocus
              />
              <button
                className="btn"
                type="submit"
                disabled={loading || !name.trim()}
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
            {error && <div className="error-msg">{error}</div>}
          </form>
        </div>
      </main>
    </>
  );
}
