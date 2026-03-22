import type {
  ApiResponse,
  Group,
  Member,
  Expense,
  Settlement,
  Transaction,
  CreateGroupBody,
  CreateMemberBody,
  CreateExpenseBody,
  MarkPaidBody,
} from "@/types";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  return json as ApiResponse<T>;
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export const createGroup = (body: CreateGroupBody) =>
  request<Group>("/groups", { method: "POST", body: JSON.stringify(body) });

export const getGroup = (id: string) =>
  request<Group>(`/groups/${id}`);

// ─── Members ──────────────────────────────────────────────────────────────────

export const getMembers = (groupId: string) =>
  request<Member[]>(`/groups/${groupId}/members`);

export const createMember = (groupId: string, body: CreateMemberBody) =>
  request<Member>(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteMember = (groupId: string, memberId: string) =>
  request<null>(`/groups/${groupId}/members/${memberId}`, {
    method: "DELETE",
  });

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const getExpenses = (groupId: string) =>
  request<Expense[]>(`/groups/${groupId}/expenses`);

export const createExpense = (groupId: string, body: CreateExpenseBody) =>
  request<Expense>(`/groups/${groupId}/expenses`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteExpense = (groupId: string, expenseId: string) =>
  request<null>(`/groups/${groupId}/expenses/${expenseId}`, {
    method: "DELETE",
  });

// ─── Settlement ───────────────────────────────────────────────────────────────

export const getSettlement = (groupId: string) =>
  request<Settlement>(`/groups/${groupId}/settlement`);

// ─── Transactions ─────────────────────────────────────────────────────────────

export const markPaid = (groupId: string, body: MarkPaidBody) =>
  request<Transaction>(`/groups/${groupId}/transactions`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const unmarkPaid = (groupId: string, txId: string) =>
  request<null>(`/groups/${groupId}/transactions/${txId}`, {
    method: "DELETE",
  });
