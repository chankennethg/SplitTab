import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const splitTypeEnum = pgEnum("split_type", ["even", "custom"]);

// ─── Groups ──────────────────────────────────────────────────────────────────
export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Members ─────────────────────────────────────────────────────────────────
export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  payerId: uuid("payer_id")
    .notNull()
    .references(() => members.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Expense Splits ───────────────────────────────────────────────────────────
export const expenseSplits = pgTable("expense_splits", {
  id: uuid("id").defaultRandom().primaryKey(),
  expenseId: uuid("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  splitType: splitTypeEnum("split_type").notNull().default("even"),
});

// ─── Transactions (paid status) ───────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  fromMemberId: uuid("from_member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  toMemberId: uuid("to_member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(members),
  expenses: many(expenses),
  transactions: many(transactions),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  group: one(groups, { fields: [members.groupId], references: [groups.id] }),
  paidExpenses: many(expenses),
  expenseSplits: many(expenseSplits),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  payer: one(members, { fields: [expenses.payerId], references: [members.id] }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  member: one(members, {
    fields: [expenseSplits.memberId],
    references: [members.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  group: one(groups, {
    fields: [transactions.groupId],
    references: [groups.id],
  }),
  fromMember: one(members, {
    fields: [transactions.fromMemberId],
    references: [members.id],
  }),
  toMember: one(members, {
    fields: [transactions.toMemberId],
    references: [members.id],
  }),
}));
