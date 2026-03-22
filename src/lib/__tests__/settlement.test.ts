import { describe, it, expect } from "vitest";
import { calculateSettlement } from "../settlement";
import type { Member, Expense, Transaction } from "@/types";

// Helpers
function member(id: string, name: string): Member {
  return { id, groupId: "g1", name, createdAt: new Date().toISOString() };
}

function expense(
  id: string,
  payerId: string,
  amount: number,
  splits: Array<{ memberId: string; amount: number }>
): Expense {
  return {
    id,
    groupId: "g1",
    name: id,
    amount,
    payerId,
    payerName: payerId,
    splits: splits.map((s) => ({
      id: `${id}-${s.memberId}`,
      expenseId: id,
      memberId: s.memberId,
      memberName: s.memberId,
      amount: s.amount,
      splitType: "even" as const,
    })),
    createdAt: new Date().toISOString(),
  };
}

const noTransactions: Transaction[] = [];

describe("calculateSettlement", () => {
  it("returns zero total and empty transactions for no expenses", () => {
    const members = [member("a", "Alice"), member("b", "Bob")];
    const result = calculateSettlement(members, [], noTransactions);

    expect(result.totalSpent).toBe(0);
    expect(result.transactions).toHaveLength(0);
    expect(result.balances).toHaveLength(2);
    expect(result.balances[0].netBalance).toBe(0);
  });

  it("calculates simple two-person equal split correctly", () => {
    const members = [member("a", "Alice"), member("b", "Bob")];
    const expenseList = [
      expense("e1", "a", 100, [
        { memberId: "a", amount: 50 },
        { memberId: "b", amount: 50 },
      ]),
    ];

    const result = calculateSettlement(members, expenseList, noTransactions);

    expect(result.totalSpent).toBe(100);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].fromMemberId).toBe("b");
    expect(result.transactions[0].toMemberId).toBe("a");
    expect(result.transactions[0].amount).toBe(50);

    const alice = result.balances.find((b) => b.memberId === "a")!;
    const bob = result.balances.find((b) => b.memberId === "b")!;

    expect(alice.netBalance).toBe(50);
    expect(bob.netBalance).toBe(-50);
  });

  it("produces minimum transactions for three-person split", () => {
    // Alice paid $90 split 3 ways ($30 each)
    // Bob owes $30, Charlie owes $30
    const members = [member("a", "Alice"), member("b", "Bob"), member("c", "Charlie")];
    const expenseList = [
      expense("e1", "a", 90, [
        { memberId: "a", amount: 30 },
        { memberId: "b", amount: 30 },
        { memberId: "c", amount: 30 },
      ]),
    ];

    const result = calculateSettlement(members, expenseList, noTransactions);

    expect(result.totalSpent).toBe(90);
    expect(result.transactions).toHaveLength(2);

    const bobTx = result.transactions.find((t) => t.fromMemberId === "b");
    const charlieTx = result.transactions.find((t) => t.fromMemberId === "c");

    expect(bobTx?.toMemberId).toBe("a");
    expect(bobTx?.amount).toBe(30);
    expect(charlieTx?.toMemberId).toBe("a");
    expect(charlieTx?.amount).toBe(30);
  });

  it("handles multiple expenses with different payers", () => {
    // Alice paid $60, Bob paid $60, split equally
    // Alice owes Bob: 30, Bob owes Alice: 30 → net zero
    const members = [member("a", "Alice"), member("b", "Bob")];
    const expenseList = [
      expense("e1", "a", 60, [
        { memberId: "a", amount: 30 },
        { memberId: "b", amount: 30 },
      ]),
      expense("e2", "b", 60, [
        { memberId: "a", amount: 30 },
        { memberId: "b", amount: 30 },
      ]),
    ];

    const result = calculateSettlement(members, expenseList, noTransactions);

    expect(result.totalSpent).toBe(120);
    expect(result.transactions).toHaveLength(0);

    const alice = result.balances.find((b) => b.memberId === "a")!;
    const bob = result.balances.find((b) => b.memberId === "b")!;

    expect(alice.netBalance).toBe(0);
    expect(bob.netBalance).toBe(0);
  });

  it("attaches transactionId and paidAt from existing transactions", () => {
    const members = [member("a", "Alice"), member("b", "Bob")];
    const expenseList = [
      expense("e1", "a", 100, [
        { memberId: "a", amount: 50 },
        { memberId: "b", amount: 50 },
      ]),
    ];

    const existingTx: Transaction[] = [
      {
        id: "tx1",
        groupId: "g1",
        fromMemberId: "b",
        fromMemberName: "Bob",
        toMemberId: "a",
        toMemberName: "Alice",
        amount: 50,
        paidAt: "2024-01-01T00:00:00Z",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = calculateSettlement(members, expenseList, existingTx);

    expect(result.transactions[0].transactionId).toBe("tx1");
    expect(result.transactions[0].paidAt).toBe("2024-01-01T00:00:00Z");
  });

  it("correctly computes totalPaid and totalOwed per member", () => {
    const members = [member("a", "Alice"), member("b", "Bob"), member("c", "Charlie")];
    const expenseList = [
      expense("e1", "a", 60, [
        { memberId: "a", amount: 20 },
        { memberId: "b", amount: 20 },
        { memberId: "c", amount: 20 },
      ]),
    ];

    const result = calculateSettlement(members, expenseList, noTransactions);
    const alice = result.balances.find((b) => b.memberId === "a")!;

    expect(alice.totalPaid).toBe(60);
    expect(alice.totalOwed).toBe(20);
    expect(alice.netBalance).toBe(40);
  });
});
