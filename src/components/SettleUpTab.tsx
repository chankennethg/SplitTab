"use client";

import { useState, useEffect, useCallback } from "react";
import { getSettlement, markPaid, unmarkPaid } from "@/lib/api-client";
import type { Settlement, SettlementTransaction, MemberBalance } from "@/types";

const COLORS = [
  "#c8f045", "#ff6b6b", "#60a5fa", "#fb923c",
  "#a78bfa", "#34d399", "#f472b6", "#38bdf8",
];

function getColor(name: string, allNames: string[]): string {
  const idx = allNames.indexOf(name);
  return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
}

interface Props {
  groupId: string;
}

export default function SettleUpTab({ groupId }: Props) {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getSettlement(groupId);
    setLoading(false);
    if (res.success && res.data) setSettlement(res.data);
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTogglePaid(tx: SettlementTransaction) {
    const key = `${tx.fromMemberId}|${tx.toMemberId}`;
    setTogglingId(key);

    if (tx.transactionId && tx.paidAt) {
      await unmarkPaid(groupId, tx.transactionId);
    } else {
      await markPaid(groupId, {
        fromMemberId: tx.fromMemberId,
        toMemberId: tx.toMemberId,
        amount: tx.amount,
      });
    }

    setTogglingId(null);
    await load();
  }

  if (loading) {
    return (
      <div className="section">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="section">
        <div className="empty-state">Could not load settlement data.</div>
      </div>
    );
  }

  const allNames = settlement.balances.map((b) => b.memberName);

  if (settlement.balances.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">Add members and expenses to see settlements.</div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="total-display">
        <div className="total-label">Total spent</div>
        <div className="total-amount">${settlement.totalSpent.toFixed(2)}</div>
      </div>

      {settlement.transactions.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "12px 0" }}>
            All balances are settled!
          </div>
        </div>
      ) : (
        <>
          <div className="card-title" style={{ paddingTop: 4 }}>
            Settlements
          </div>
          {settlement.transactions.map((tx) => {
            const key = `${tx.fromMemberId}|${tx.toMemberId}`;
            const isPaid = Boolean(tx.paidAt);
            return (
              <div
                className={`settle-card${isPaid ? " paid" : ""}`}
                key={key}
              >
                <div className="settle-info">
                  <div className="settle-names">
                    <strong>{tx.fromMemberName}</strong> → {tx.toMemberName}
                  </div>
                  <div className="settle-amount">${tx.amount.toFixed(2)}</div>
                  {isPaid && (
                    <div className="settle-paid-label">Marked as paid</div>
                  )}
                </div>
                <button
                  className={`btn btn-sm ${isPaid ? "btn-ghost" : "btn-paid"}`}
                  onClick={() => handleTogglePaid(tx)}
                  disabled={togglingId === key}
                >
                  {isPaid ? "Undo" : "Mark paid"}
                </button>
              </div>
            );
          })}
        </>
      )}

      {settlement.balances.length > 0 && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-title">Balances</div>
          {settlement.balances.map((b) => (
            <BalanceRow key={b.memberId} balance={b} color={getColor(b.memberName, allNames)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BalanceRow({
  balance,
  color,
}: {
  balance: MemberBalance;
  color: string;
}) {
  const net = balance.netBalance;
  const absNet = Math.abs(net);

  let amountClass = "zero";
  let badgeClass = "badge-gray";
  let badgeLabel = "All clear";

  if (net > 0.01) {
    amountClass = "positive";
    badgeClass = "badge-green";
    badgeLabel = "Gets back";
  } else if (net < -0.01) {
    amountClass = "negative";
    badgeClass = "badge-red";
    badgeLabel = "Owes others";
  }

  return (
    <div className="balance-row">
      <div
        className="avatar-lg"
        style={{ background: color }}
      >
        {balance.memberName[0].toUpperCase()}
      </div>
      <div className="balance-info">
        <div className="balance-name">{balance.memberName}</div>
        <div className="balance-detail">
          Paid ${balance.totalPaid.toFixed(2)} · Owes ${balance.totalOwed.toFixed(2)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className={`balance-amount ${amountClass}`}>
          {net > 0.01 ? "+" : ""}
          {absNet < 0.01 ? "–" : `$${absNet.toFixed(2)}`}
        </div>
        <div className={`badge ${badgeClass}`}>{badgeLabel}</div>
      </div>
    </div>
  );
}
