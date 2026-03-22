// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  createdAt: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  memberName: string;
  amount: number;
  splitType: "even" | "custom";
}

export interface Expense {
  id: string;
  groupId: string;
  name: string;
  amount: number;
  payerId: string;
  payerName: string;
  splits: ExpenseSplit[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  groupId: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  paidAt: string | null;
  createdAt: string;
}

// ─── Settlement Types ──────────────────────────────────────────────────────────

export interface SettlementTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  transactionId?: string;
  paidAt?: string | null;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface Settlement {
  totalSpent: number;
  transactions: SettlementTransaction[];
  balances: MemberBalance[];
}

// ─── API Request/Response Types ───────────────────────────────────────────────

export interface CreateGroupBody {
  name: string;
}

export interface CreateMemberBody {
  name: string;
}

export interface CreateExpenseBody {
  name: string;
  amount: number;
  payerId: string;
  splits: Array<{ memberId: string; amount: number; splitType: "even" | "custom" }>;
}

export interface MarkPaidBody {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
