import { Hono } from "hono";
import { handle } from "hono/vercel";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  groups,
  members,
  expenses,
  expenseSplits,
  transactions,
} from "@/db/schema";
import { ok, err } from "@/lib/api-response";
import { calculateSettlement } from "@/lib/settlement";
import type {
  Expense,
  Member,
  Transaction,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const app = new Hono().basePath("/api");

// ─── Groups ───────────────────────────────────────────────────────────────────

app.post(
  "/groups",
  zValidator("json", z.object({ name: z.string().min(1).max(255) })),
  async (c) => {
    const { name } = c.req.valid("json");
    const [group] = await db.insert(groups).values({ name }).returning();
    return c.json(ok(group), 201);
  }
);

app.get("/groups/:id", async (c) => {
  const { id } = c.req.param();
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });
  if (!group) return c.json(err("Group not found"), 404);
  return c.json(ok(group));
});

// ─── Members ──────────────────────────────────────────────────────────────────

app.get("/groups/:id/members", async (c) => {
  const { id } = c.req.param();
  const rows = await db.query.members.findMany({
    where: eq(members.groupId, id),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  return c.json(ok(rows));
});

app.post(
  "/groups/:id/members",
  zValidator("json", z.object({ name: z.string().min(1).max(255) })),
  async (c) => {
    const { id } = c.req.param();
    const { name } = c.req.valid("json");

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });
    if (!group) return c.json(err("Group not found"), 404);

    // Prevent duplicate names in same group
    const existing = await db.query.members.findFirst({
      where: and(eq(members.groupId, id), eq(members.name, name)),
    });
    if (existing) return c.json(err("Member already exists in this group"), 409);

    const [member] = await db
      .insert(members)
      .values({ groupId: id, name })
      .returning();
    return c.json(ok(member), 201);
  }
);

app.delete("/groups/:id/members/:memberId", async (c) => {
  const { memberId } = c.req.param();
  await db.delete(members).where(eq(members.id, memberId));
  return c.json(ok(null));
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

const createExpenseSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  payerId: z.string().uuid(),
  splits: z.array(
    z.object({
      memberId: z.string().uuid(),
      amount: z.number().nonnegative(),
      splitType: z.enum(["even", "custom"]),
    })
  ).min(1),
});

app.get("/groups/:id/expenses", async (c) => {
  const { id } = c.req.param();
  const rows = await db.query.expenses.findMany({
    where: eq(expenses.groupId, id),
    with: {
      payer: true,
      splits: { with: { member: true } },
    },
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  });

  const result: Expense[] = rows.map((e) => ({
    id: e.id,
    groupId: e.groupId,
    name: e.name,
    amount: Number(e.amount),
    payerId: e.payerId,
    payerName: e.payer.name,
    splits: e.splits.map((s) => ({
      id: s.id,
      expenseId: s.expenseId,
      memberId: s.memberId,
      memberName: s.member.name,
      amount: Number(s.amount),
      splitType: s.splitType,
    })),
    createdAt: e.createdAt.toISOString(),
  }));

  return c.json(ok(result));
});

app.post(
  "/groups/:id/expenses",
  zValidator("json", createExpenseSchema),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });
    if (!group) return c.json(err("Group not found"), 404);

    // Validate splits sum equals amount (within rounding tolerance)
    const splitsSum = body.splits.reduce((s, sp) => s + sp.amount, 0);
    if (Math.abs(splitsSum - body.amount) > 0.02) {
      return c.json(err("Splits must sum to the expense amount"), 400);
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        groupId: id,
        name: body.name,
        amount: body.amount.toFixed(2),
        payerId: body.payerId,
      })
      .returning();

    await db.insert(expenseSplits).values(
      body.splits.map((s) => ({
        expenseId: expense.id,
        memberId: s.memberId,
        amount: s.amount.toFixed(2),
        splitType: s.splitType,
      }))
    );

    return c.json(ok(expense), 201);
  }
);

app.delete("/groups/:id/expenses/:expenseId", async (c) => {
  const { expenseId } = c.req.param();
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  return c.json(ok(null));
});

// ─── Settlement ───────────────────────────────────────────────────────────────

app.get("/groups/:id/settlement", async (c) => {
  const { id } = c.req.param();

  const [groupMembers, groupExpenses, groupTransactions] = await Promise.all([
    db.query.members.findMany({
      where: eq(members.groupId, id),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    }),
    db.query.expenses.findMany({
      where: eq(expenses.groupId, id),
      with: {
        payer: true,
        splits: { with: { member: true } },
      },
    }),
    db.query.transactions.findMany({
      where: eq(transactions.groupId, id),
      with: { fromMember: true, toMember: true },
    }),
  ]);

  const memberList: Member[] = groupMembers.map((m) => ({
    id: m.id,
    groupId: m.groupId,
    name: m.name,
    createdAt: m.createdAt.toISOString(),
  }));

  const expenseList: Expense[] = groupExpenses.map((e) => ({
    id: e.id,
    groupId: e.groupId,
    name: e.name,
    amount: Number(e.amount),
    payerId: e.payerId,
    payerName: e.payer.name,
    splits: e.splits.map((s) => ({
      id: s.id,
      expenseId: s.expenseId,
      memberId: s.memberId,
      memberName: s.member.name,
      amount: Number(s.amount),
      splitType: s.splitType,
    })),
    createdAt: e.createdAt.toISOString(),
  }));

  const transactionList: Transaction[] = groupTransactions.map((t) => ({
    id: t.id,
    groupId: t.groupId,
    fromMemberId: t.fromMemberId,
    fromMemberName: t.fromMember.name,
    toMemberId: t.toMemberId,
    toMemberName: t.toMember.name,
    amount: Number(t.amount),
    paidAt: t.paidAt ? t.paidAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  }));

  const settlement = calculateSettlement(memberList, expenseList, transactionList);
  return c.json(ok(settlement));
});

// ─── Transactions (paid status) ───────────────────────────────────────────────

app.post(
  "/groups/:id/transactions",
  zValidator(
    "json",
    z.object({
      fromMemberId: z.string().uuid(),
      toMemberId: z.string().uuid(),
      amount: z.number().positive(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const [tx] = await db
      .insert(transactions)
      .values({
        groupId: id,
        fromMemberId: body.fromMemberId,
        toMemberId: body.toMemberId,
        amount: body.amount.toFixed(2),
        paidAt: new Date(),
      })
      .returning();

    return c.json(ok(tx), 201);
  }
);

app.delete("/groups/:id/transactions/:txId", async (c) => {
  const { txId } = c.req.param();
  await db.delete(transactions).where(eq(transactions.id, txId));
  return c.json(ok(null));
});

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
