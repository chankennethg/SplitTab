"use client";

import { useState, useEffect, useCallback, use } from "react";
import { getGroup, getMembers, getExpenses } from "@/lib/api-client";
import type { Group, Member, Expense } from "@/types";
import MembersTab from "@/components/MembersTab";
import ExpensesTab from "@/components/ExpensesTab";
import SettleUpTab from "@/components/SettleUpTab";

type Tab = "members" | "expenses" | "settle";

export default function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    const res = await getGroup(id);
    if (!res.success || !res.data) {
      setLoadError("Group not found");
      return;
    }
    setGroup(res.data);
  }, [id]);

  const loadMembers = useCallback(async () => {
    const res = await getMembers(id);
    if (res.success && res.data) setMembers(res.data);
  }, [id]);

  const loadExpenses = useCallback(async () => {
    const res = await getExpenses(id);
    if (res.success && res.data) setExpenses(res.data);
  }, [id]);

  useEffect(() => {
    void loadGroup();
    void loadMembers();
    void loadExpenses();
  }, [loadGroup, loadMembers, loadExpenses]);

  if (loadError) {
    return (
      <>
        <header className="header">
          <div className="header-inner">
            <a className="logo" href="/">
              Split<span className="logo-accent">Tab</span>
            </a>
          </div>
        </header>
        <main className="container">
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>404</div>
            <div>{loadError}</div>
            <a href="/" style={{ color: "var(--accent)", marginTop: 12, display: "block" }}>
              Create a new group
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <a className="logo" href="/">
            Split<span className="logo-accent">Tab</span>
          </a>
          <div className="member-badge">
            {members.length} {members.length === 1 ? "member" : "members"}
          </div>
        </div>
      </header>

      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {(["members", "expenses", "settle"] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`tab-btn${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "members"
                ? "Members"
                : tab === "expenses"
                ? "Expenses"
                : "Settle Up"}
            </button>
          ))}
        </div>
      </nav>

      <main className="container">
        {group && (
          <div
            style={{
              padding: "12px 0 4px",
              color: "var(--muted)",
              fontSize: "0.82rem",
            }}
          >
            Group: <strong style={{ color: "var(--text)" }}>{group.name}</strong>
          </div>
        )}

        {activeTab === "members" && (
          <MembersTab
            groupId={id}
            members={members}
            onMembersChange={loadMembers}
            onClearAll={() => {
              void loadMembers();
              void loadExpenses();
            }}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            groupId={id}
            members={members}
            expenses={expenses}
            onExpensesChange={loadExpenses}
          />
        )}

        {activeTab === "settle" && (
          <SettleUpTab groupId={id} />
        )}
      </main>
    </>
  );
}
