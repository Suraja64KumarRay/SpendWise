import Transaction from "../models/Transaction.js";
import asyncHandler from "../utils/asyncHandler.js";
import { dateRange, monthBounds } from "../utils/dates.js";
import { fail, oid, round } from "../utils/helpers.js";
import { buildFilter } from "./transactionController.js";
import { categoryBreakdown, totalsByType } from "./analyticsController.js";

const buildReport = async (userId, match, period) => {
  const [totals, expenseByCategory, incomeByCategory, monthlyRows] = await Promise.all([
    totalsByType(userId, match),
    categoryBreakdown(userId, "expense", match),
    categoryBreakdown(userId, "income", match),
    Transaction.aggregate([
      { $match: { user: oid(userId), ...match } },
      {
        $group: {
          _id: { month: { $dateToString: { format: "%Y-%m", date: "$date" } }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const map = new Map();
  monthlyRows.forEach((r) => {
    const row = map.get(r._id.month) || { month: r._id.month, income: 0, expense: 0 };
    row[r._id.type] = round(r.total);
    map.set(r._id.month, row);
  });
  const byMonth = [...map.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, savings: round(m.income - m.expense) }));

  const savings = round(totals.income - totals.expense);
  return {
    period,
    summary: {
      totalIncome: totals.income,
      totalExpense: totals.expense,
      savings,
      savingsRate: totals.income ? round((savings / totals.income) * 100) : 0,
      transactionCount: totals.incomeCount + totals.expenseCount,
      topExpenseCategory: expenseByCategory[0]?.name || null,
    },
    expenseByCategory,
    incomeByCategory,
    byMonth,
  };
};

// GET /api/reports/monthly?month=YYYY-MM
export const monthlyReport = asyncHandler(async (req, res) => {
  const b = monthBounds(req.query.month);
  if (!b) fail(res, 400, "month must be YYYY-MM");
  res.json(await buildReport(req.user._id, { date: { $gte: b.start, $lt: b.end } }, { label: req.query.month }));
});

// GET /api/reports/yearly?year=2026
export const yearlyReport = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year);
  if (!year || year < 1970 || year > 2100) fail(res, 400, "year must be a 4-digit year");
  const match = { date: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) } };
  res.json(await buildReport(req.user._id, match, { label: String(year) }));
});

// GET /api/reports/custom?from=YYYY-MM-DD&to=YYYY-MM-DD
export const customReport = asyncHandler(async (req, res) => {
  const range = dateRange(req.query.from, req.query.to);
  if (!range || !range.$gte || !range.$lte) fail(res, 400, "Both from and to dates are required (YYYY-MM-DD)");
  if (range.$gte > range.$lte) fail(res, 400, "'from' must be before 'to'");
  res.json(await buildReport(req.user._id, { date: range }, { label: `${req.query.from} to ${req.query.to}`, from: req.query.from, to: req.query.to }));
});

// CSV cell: quote it, and neutralise spreadsheet formulas (=, +, -, @) so a
// malicious description like "=HYPERLINK(...)" can't execute when opened in Excel.
const csvCell = (value) => {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /api/reports/export?from=&to=&type=&category=&search=
export const exportCsv = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.user._id, req.query);
  const txs = await Transaction.find(filter)
    .sort({ date: -1, _id: -1 })
    .populate("category", "name")
    .lean();

  const header = ["Date", "Type", "Category", "Amount", "Description", "Notes"];
  const lines = txs.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      t.type,
      t.category?.name || "Uncategorized",
      t.amount.toFixed(2),
      t.description,
      t.notes,
    ].map(csvCell).join(",")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="spendwise-transactions.csv"');
  res.send("﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n")); // BOM so Excel reads UTF-8
});
