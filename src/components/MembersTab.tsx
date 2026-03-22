"use client";

import { useState } from "react";
import { createMember, deleteMember } from "@/lib/api-client";
import type { Member } from "@/types";

const COLORS = [
  "#c8f045", "#ff6b6b", "#60a5fa", "#fb923c",
  "#a78bfa", "#34d399", "#f472b6", "#38bdf8",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

interface Props {
  groupId: string;
  members: Member[];
  onMembersChange: () => void;
  onClearAll: () => void;
}

export default function MembersTab({
  groupId,
  members,
  onMembersChange,
  onClearAll,
}: Props) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    const res = await createMember(groupId, { name: trimmed });
    setLoading(false);

    if (!res.success) {
      setError(res.error ?? "Failed to add member");
      return;
    }

    setNewName("");
    onMembersChange();
  }

  async function handleDelete(memberId: string) {
    await deleteMember(groupId, memberId);
    onMembersChange();
  }

  return (
    <div className="section">
      <div className="notice">
        Data is saved to the server. Share this page&apos;s URL to collaborate.
      </div>

      <div className="card">
        <div className="card-title">Add member</div>
        <form onSubmit={handleAdd}>
          <div className="input-row">
            <input
              className="input"
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={255}
            />
            <button
              className="btn"
              type="submit"
              disabled={loading || !newName.trim()}
            >
              Add
            </button>
          </div>
          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>

      {members.length > 0 && (
        <div className="card">
          <div className="card-title">Members ({members.length})</div>
          <div className="chips">
            {members.map((m, i) => (
              <div className="chip" key={m.id}>
                <div
                  className="avatar"
                  style={{ background: getColor(i) }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                <span className="chip-name">{m.name}</span>
                <button
                  className="chip-del"
                  onClick={() => handleDelete(m.id)}
                  aria-label={`Remove ${m.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <div className="empty-state">No members yet. Add someone above.</div>
      )}
    </div>
  );
}
