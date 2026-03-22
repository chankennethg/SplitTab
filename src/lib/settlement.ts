import type {
  Expense,
  Member,
  MemberBalance,
  Settlement,
  SettlementTransaction,
  Transaction,
} from "@/types";

/**
 * Rounds a number to 2 decimal places to avoid floating-point drift.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculates the minimum-transaction settlement for a group using a greedy
 * algorithm: repeatedly match the largest debtor to the largest creditor.
 */
export function calculateSettlement(
  members: Member[],
  expenses: Expense[],
  existingTransactions: Transaction[]
): Settlement {
  const totalSpent = round2(
    expenses.reduce((sum, e) => sum + e.amount, 0)
  );

  // Build balance map: positive = gets back money, negative = owes money
  const balanceMap = new Map<string, number>();
  for (const m of members) {
    balanceMap.set(m.id, 0);
  }

  for (const expense of expenses) {
    // Payer gets credit for the full amount
    const payerBalance = balanceMap.get(expense.payerId) ?? 0;
    balanceMap.set(expense.payerId, round2(payerBalance + expense.amount));

    // Each participant is debited their share
    for (const split of expense.splits) {
      const current = balanceMap.get(split.memberId) ?? 0;
      balanceMap.set(split.memberId, round2(current - split.amount));
    }
  }

  // Build member name lookup
  const memberNameMap = new Map(members.map((m) => [m.id, m.name]));

  // Build balance objects
  const balances: MemberBalance[] = members.map((m) => {
    const totalPaid = round2(
      expenses
        .filter((e) => e.payerId === m.id)
        .reduce((sum, e) => sum + e.amount, 0)
    );
    const totalOwed = round2(
      expenses
        .flatMap((e) => e.splits)
        .filter((s) => s.memberId === m.id)
        .reduce((sum, s) => sum + s.amount, 0)
    );
    return {
      memberId: m.id,
      memberName: m.name,
      totalPaid,
      totalOwed,
      netBalance: round2(totalPaid - totalOwed),
    };
  });

  // Greedy settlement: creditors (balance > 0) vs debtors (balance < 0)
  const creditors = balances
    .filter((b) => b.netBalance > 0.001)
    .map((b) => ({ ...b, remaining: b.netBalance }));
  const debtors = balances
    .filter((b) => b.netBalance < -0.001)
    .map((b) => ({ ...b, remaining: Math.abs(b.netBalance) }));

  const settlements: SettlementTransaction[] = [];

  // Sort descending so we process largest first
  creditors.sort((a, b) => b.remaining - a.remaining);
  debtors.sort((a, b) => b.remaining - a.remaining);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = round2(Math.min(creditor.remaining, debtor.remaining));

    if (amount > 0.001) {
      // Look up if there is an existing persisted transaction for this pair
      const existing = existingTransactions.find(
        (t) =>
          t.fromMemberId === debtor.memberId &&
          t.toMemberId === creditor.memberId &&
          Math.abs(t.amount - amount) < 0.01
      );

      settlements.push({
        fromMemberId: debtor.memberId,
        fromMemberName: memberNameMap.get(debtor.memberId) ?? debtor.memberId,
        toMemberId: creditor.memberId,
        toMemberName: memberNameMap.get(creditor.memberId) ?? creditor.memberId,
        amount,
        transactionId: existing?.id,
        paidAt: existing?.paidAt ?? null,
      });
    }

    creditor.remaining = round2(creditor.remaining - amount);
    debtor.remaining = round2(debtor.remaining - amount);

    if (creditor.remaining < 0.001) ci++;
    if (debtor.remaining < 0.001) di++;
  }

  return { totalSpent, transactions: settlements, balances };
}
