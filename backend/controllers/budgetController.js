import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import asyncHandler from "../utils/asyncHandler.js";
import { currentMonth, monthBounds } from "../utils/dates.js";
import { fail, oid, round } from "../utils/helpers.js";

export const WARNING_THRESHOLD = 80; // % of budget at which we start warning

// Joins budgets with real spending for the month. Used by the API and by insights.
export const computeBudgets = async (userId, month) => {
  const b = monthBounds(month);
  const budgets = await Budget.find({ user: userId, month })
    .populate("category", "name icon color")
    .lean();

  const spentRows = await Transaction.aggregate([
    { $match: { user: oid(userId), type: "expense", date: { $gte: b.start, $lt: b.end } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);
  const spentMap = new Map(spentRows.map((r) => [String(r._id), r.total]));
  const totalSpent = spentRows.reduce((s, r) => s + r.total, 0);

  return budgets
    .map((bg) => {
      const spent = bg.category ? spentMap.get(String(bg.category._id)) || 0 : totalSpent;
      const percent = round((spent / bg.amount) * 100);
      const status = percent >= 100 ? "exceeded" : percent >= WARNING_THRESHOLD ? "warning" : "ok";
      const label = bg.category ? bg.category.name : "Overall budget";
      let alert = null;
      if (status === "exceeded") alert = `${label}: over budget by ${round(spent - bg.amount)}`;
      else if (status === "warning") alert = `${label}: ${percent}% of budget used`;
      return {
        _id: bg._id,
        month: bg.month,
        category: bg.category,
        amount: bg.amount,
        spent: round(spent),
        remaining: round(bg.amount - spent),
        percent,
        status,
        alert,
      };
    })
    // overall first, then the most-consumed budgets
    .sort((a, b) => (a.category ? 1 : 0) - (b.category ? 1 : 0) || b.percent - a.percent);
};

// GET /api/budgets?month=YYYY-MM
export const getBudgets = asyncHandler(async (req, res) => {
  const month = req.query.month || currentMonth();
  if (!monthBounds(month)) fail(res, 400, "month must be YYYY-MM");
  const budgets = await computeBudgets(req.user._id, month);
  res.json({ month, budgets, alerts: budgets.filter((b) => b.alert).map((b) => ({ status: b.status, message: b.alert })) });
});

// POST /api/budgets  { month, amount, category? }  -> creates or updates (upsert)
export const upsertBudget = asyncHandler(async (req, res) => {
  const { month, amount, category } = req.body;
  if (!monthBounds(month)) fail(res, 400, "month must be YYYY-MM");

  if (category) {
    const cat = await Category.findOne({ _id: category, user: req.user._id, type: "expense" });
    if (!cat) fail(res, 400, "Budgets can only be set on your expense categories");
  }

  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, category: category || null, month },
    { amount },
    { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.status(201).json(budget);
});

// DELETE /api/budgets/:id
export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) fail(res, 404, "Budget not found");
  res.json({ message: "Budget deleted" });
});
