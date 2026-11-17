import Transaction from "../models/Transaction.js";
import asyncHandler from "../utils/asyncHandler.js";
import { currentMonth, dateRange, monthBounds } from "../utils/dates.js";
import { fail, oid, round } from "../utils/helpers.js";

/* ---------- reusable aggregation helpers (also used by insights + reports) ---------- */

export const totalsByType = async (userId, match = {}) => {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), ...match } },
    { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  const out = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
  rows.forEach((r) => {
    out[r._id] = round(r.total);
    out[`${r._id}Count`] = r.count;
  });
  return out;
};

export const categoryBreakdown = async (userId, type, match = {}) => {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type, ...match } },
    { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
    { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        name: { $ifNull: ["$cat.name", "Uncategorized"] },
        icon: { $ifNull: ["$cat.icon", "❓"] },
        color: { $ifNull: ["$cat.color", "#adb5bd"] },
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);
  const sum = rows.reduce((s, r) => s + r.total, 0);
  return rows.map((r) => ({
    ...r,
    total: round(r.total),
    percent: sum ? round((r.total / sum) * 100) : 0,
  }));
};

const pctChange = (current, previous) =>
  previous > 0 ? round(((current - previous) / previous) * 100) : null;

/* ---------- controllers ---------- */

// GET /api/analytics/summary?month=YYYY-MM  (dashboard cards + recent transactions)
export const getSummary = asyncHandler(async (req, res) => {
  const month = req.query.month || currentMonth();
  const bounds = monthBounds(month);
  if (!bounds) fail(res, 400, "month must be YYYY-MM");

  const [all, thisMonth, recent] = await Promise.all([
    totalsByType(req.user._id),
    totalsByType(req.user._id, { date: { $gte: bounds.start, $lt: bounds.end } }),
    Transaction.find({ user: req.user._id })
      .sort({ date: -1, _id: -1 })
      .limit(5)
      .populate("category", "name icon color type")
      .lean(),
  ]);

  res.json({
    month,
    totalIncome: all.income,
    totalExpense: all.expense,
    balance: round(all.income - all.expense),
    monthIncome: thisMonth.income,
    monthExpense: thisMonth.expense,
    monthlySavings: round(thisMonth.income - thisMonth.expense),
    recent,
  });
});

// GET /api/analytics/monthly?year=2026  -> 12 rows with income/expense/savings + change vs previous month
export const getMonthly = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getUTCFullYear();
  const rows = await Transaction.aggregate([
    {
      $match: {
        user: oid(req.user._id),
        date: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) },
      },
    },
    { $group: { _id: { m: { $month: "$date" }, type: "$type" }, total: { $sum: "$amount" } } },
  ]);

  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months = labels.map((label, i) => ({ month: i + 1, label, income: 0, expense: 0, savings: 0 }));
  rows.forEach((r) => {
    months[r._id.m - 1][r._id.type] = round(r.total);
  });
  months.forEach((m, i) => {
    m.savings = round(m.income - m.expense);
    const prev = months[i - 1];
    m.expenseChangePct = prev ? pctChange(m.expense, prev.expense) : null;
    m.incomeChangePct = prev ? pctChange(m.income, prev.income) : null;
  });

  res.json({ year, months });
});

// GET /api/analytics/categories?type=expense&month=YYYY-MM | &from=&to=
export const getCategoryBreakdown = asyncHandler(async (req, res) => {
  const type = req.query.type === "income" ? "income" : "expense";
  const match = {};
  if (req.query.month) {
    const b = monthBounds(req.query.month);
    if (!b) fail(res, 400, "month must be YYYY-MM");
    match.date = { $gte: b.start, $lt: b.end };
  } else {
    const range = dateRange(req.query.from, req.query.to);
    if (range) match.date = range;
  }
  res.json(await categoryBreakdown(req.user._id, type, match));
});

const FORMATS = { daily: "%Y-%m-%d", weekly: "%G-W%V", monthly: "%Y-%m", yearly: "%Y" };

// GET /api/analytics/trends?period=daily|weekly|monthly|yearly
export const getTrends = asyncHandler(async (req, res) => {
  const period = FORMATS[req.query.period] ? req.query.period : "daily";
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let start = null;
  if (period === "daily") start = new Date(todayUTC.getTime() - 29 * 86400000);
  if (period === "weekly") start = new Date(todayUTC.getTime() - 12 * 7 * 86400000);
  if (period === "monthly") start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

  const match = { user: oid(req.user._id) };
  if (start) match.date = { $gte: start };

  const rows = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { label: { $dateToString: { format: FORMATS[period], date: "$date" } }, type: "$type" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const map = new Map();
  if (period === "daily") {
    // fill empty days so the line chart has a continuous x-axis
    for (let i = 0; i < 30; i++) {
      const label = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
      map.set(label, { label, income: 0, expense: 0 });
    }
  }
  rows.forEach((r) => {
    const row = map.get(r._id.label) || { label: r._id.label, income: 0, expense: 0 };
    row[r._id.type] = round(r.total);
    map.set(r._id.label, row);
  });

  res.json({
    period,
    data: [...map.values()].sort((a, b) => a.label.localeCompare(b.label)),
  });
});
