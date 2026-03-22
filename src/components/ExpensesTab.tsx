"use client";

import { useState } from "react";
import { createExpense, deleteExpense } from "@/lib/api-client";
import type { Member, Expense } from "@/types";

interface Props {
  groupId: string;
  members: Member[];
  expenses: Expense[];
  onExpensesChange: () => void;
}

type SplitType = "even" | "custom";

export default function ExpensesTab({
  groupId,
  members,
  expenses,
  onExpensesChange,
}: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("even");
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recompute participants when members change (sync new members in)
  // (Handled by re-render since members prop is live)

  function toggleParticipant(memberId: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  const totalAmount = parseFloat(amount) || 0;
  const participantList = members.filter((m) => participants.has(m.id));

  function evenSplitAmount(): number {
    if (participantList.length === 0) return 0;
    return Math.round((totalAmount / participantList.length) * 100) / 100;
  }

  function customTotal(): number {
    return participantList.reduce((sum, m) => {
      return sum + (parseFloat(customAmounts[m.id] ?? "") || 0);
    }, 0);
  }

  const customRemaining = Math.round((totalAmount - customTotal()) * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) return setError("Expense name is required");
    if (totalAmount <= 0) return setError("Amount must be greater than 0");
    if (!payerId) return setError("Select who paid");
    if (participantList.length === 0) return setError("Select at least one participant");

    let splits: Array<{ memberId: string; amount: number; splitType: SplitType }>;

    if (splitType === "even") {
      const share = evenSplitAmount();
      // Distribute rounding error to payer's share
      splits = participantList.map((m, i) => {
        const isLast = i === participantList.length - 1;
        const adj = isLast
          ? Math.round((totalAmount - share * (participantList.length - 1)) * 100) / 100
          : share;
        return { memberId: m.id, amount: adj, splitType: "even" as const };
      });
    } else {
      if (Math.abs(customRemaining) > 0.02) {
        return setError(`Custom amounts must sum to $${totalAmount.toFixed(2)}`);
      }
      splits = participantList.map((m) => ({
        memberId: m.id,
        amount: parseFloat(customAmounts[m.id] ?? "0") || 0,
        splitType: "custom" as const,
      }));
    }

    setLoading(true);
    const res = await createExpense(groupId, {
      name: trimmedName,
      amount: totalAmount,
      payerId,
      splits,
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error ?? "Failed to add expense");
      return;
    }

    // Reset form
    setName("");
    setAmount("");
    setPayerId("");
    setSplitType("even");
    setParticipants(new Set(members.map((m) => m.id)));
    setCustomAmounts({});
    onExpensesChange();
  }

  async function handleDelete(expenseId: string) {
    await deleteExpense(groupId, expenseId);
    onExpensesChange();
  }

  if (members.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">Add members first before logging expenses.</div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="card">
        <div className="card-title">New expense</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 8 }}>
            <label className="label">Description</label>
            <input
              className="input"
              style={{ width: "100%" }}
              type="text"
              placeholder="e.g. Dinner, Hotel, Groceries..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="label">Amount ($)</label>
            <input
              className="input"
              style={{ width: "100%" }}
              type="number"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="label">Paid by</label>
            <select
              className="input"
              style={{ width: "100%" }}
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">Split</label>
            <div className="split-toggle">
              <button
                type="button"
                className={`split-toggle-btn${splitType === "even" ? " active" : ""}`}
                onClick={() => setSplitType("even")}
              >
                Equal
              </button>
              <button
                type="button"
                className={`split-toggle-btn${splitType === "custom" ? " active" : ""}`}
                onClick={() => setSplitType("custom")}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="splits-list">
            {members.map((m) => (
              <div className="split-row" key={m.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={participants.has(m.id)}
                    onChange={() => toggleParticipant(m.id)}
                  />
                  {m.name}
                </label>
                {splitType === "custom" && participants.has(m.id) && (
                  <input
                    className="input"
                    style={{ width: 90, padding: "6px 10px" }}
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={customAmounts[m.id] ?? ""}
                    onChange={(e) =>
                      setCustomAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                  />
                )}
                {splitType === "even" && participants.has(m.id) && totalAmount > 0 && (
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    ${evenSplitAmount().toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {splitType === "custom" && totalAmount > 0 && (
            <div
              className={`custom-amount-notice ${Math.abs(customRemaining) < 0.02 ? "ok" : "over"}`}
            >
              {Math.abs(customRemaining) < 0.02
                ? "Amounts balance out"
                : customRemaining > 0
                ? `$${customRemaining.toFixed(2)} remaining`
                : `$${Math.abs(customRemaining).toFixed(2)} over`}
            </div>
          )}

          {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ marginTop: 14, width: "100%" }}
          >
            {loading ? "Adding..." : "Add Expense"}
          </button>
        </form>
      </div>

      {expenses.length > 0 ? (
        <div className="card">
          <div className="card-title">Expenses ({expenses.length})</div>
          {expenses.map((e) => (
            <div className="expense-item" key={e.id}>
              <div style={{ flex: 1 }}>
                <div className="expense-name">{e.name}</div>
                <div className="expense-meta">
                  Paid by {e.payerName} &middot;{" "}
                  {e.splits.length} participant{e.splits.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <span className="expense-amount">${e.amount.toFixed(2)}</span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(e.id)}
                  aria-label={`Delete ${e.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No expenses yet.</div>
      )}
    </div>
  );
}
