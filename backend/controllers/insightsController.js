import Transaction from "../models/Transaction.js";
import asyncHandler from "../utils/asyncHandler.js";
import { currentMonth, monthBounds, shiftMonth } from "../utils/dates.js";
import { fail, oid, round } from "../utils/helpers.js";
import { computeBudgets } from "./budgetController.js";

/* Tunable rules - change these numbers to change how "smart" the insights feel. */
const SPIKE_RATIO = 1.3;        // category is 30% above its own 3-month average
const SPIKE_MIN_DIFF = 100;     // ...and at least this much money higher (ignores tiny noise)
const OVERALL_CHANGE_PCT = 10;  // overall expense change worth mentioning
const BIG_SHARE_PCT = 25;       // a discretionary category above this share of spending
const CUT_PERCENT = 10;         // suggested reduction
const LOW_SAVINGS_RATE = 10;
const GOOD_SAVINGS_RATE = 20;
// Fixed costs: suggesting "spend less on rent" is not useful advice.
const FIXED_CATEGORIES = ["rent", "bills & utilities", "education", "health"];

// GET /api/insights?month=YYYY-MM
export const getInsights = asyncHandler(async (req, res) => {
  const month = req.query.month || currentMonth();
  const bounds = monthBounds(month);
  if (!bounds) fail(res, 400, "month must be YYYY-MM");

  const prevMonth = shiftMonth(month, -1);
  const historyStart = monthBounds(shiftMonth(month, -3)).start;
  const userId = oid(req.user._id);

  // One query: expenses per (month, category) for this month + 3 months before it.
  const rows = await Transaction.aggregate([
    { $match: { user: userId, type: "expense", date: { $gte: historyStart, $lt: bounds.end } } },
    {
      $group: {
        _id: { month: { $dateToString: { format: "%Y-%m", date: "$date" } }, category: "$category" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $lookup: { from: "categories", localField: "_id.category", foreignField: "_id", as: "cat" } },
    { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    { $project: { month: "$_id.month", name: { $ifNull: ["$cat.name", "Uncategorized"] }, total: 1, count: 1 } },
  ]);

  const pastMonths = [1, 2, 3].map((n) => shiftMonth(month, -n));
  const byCat = new Map(); // name -> { current, prev, past: {month: total} }
  let currentTotal = 0;
  let prevTotal = 0;

  rows.forEach((r) => {
    const c = byCat.get(r.name) || { current: 0, prev: 0, past: {} };
    if (r.month === month) { c.current += r.total; currentTotal += r.total; }
    if (r.month === prevMonth) { c.prev += r.total; prevTotal += r.total; }
    if (pastMonths.includes(r.month)) c.past[r.month] = (c.past[r.month] || 0) + r.total;
    byCat.set(r.name, c);
  });

  const insights = [];

  /* Rule 1 - this month vs previous month (overall) */
  if (prevTotal > 0) {
    const change = round(((currentTotal - prevTotal) / prevTotal) * 100);
    if (change >= OVERALL_CHANGE_PCT) {
      insights.push({ type: "warning", title: "Spending is up vs last month",
        message: `You've spent ${round(currentTotal)} so far, ${change}% more than last month (${round(prevTotal)}).` });
    } else if (change <= -OVERALL_CHANGE_PCT) {
      insights.push({ type: "success", title: "Spending is down vs last month",
        message: `You've spent ${round(currentTotal)} so far, ${Math.abs(change)}% less than last month (${round(prevTotal)}). Nice work.` });
    } else {
      insights.push({ type: "info", title: "Spending is steady",
        message: `Your spending is within ${OVERALL_CHANGE_PCT}% of last month (${round(currentTotal)} vs ${round(prevTotal)}).` });
    }
  } else if (currentTotal > 0) {
    insights.push({ type: "info", title: "Not enough history yet",
      message: "Add transactions for the previous month to unlock month-over-month comparisons." });
  }

  /* Rule 2 - unusual increase: category vs its own 3-month average */
  const spikes = [];
  byCat.forEach((c, name) => {
    const monthsWithData = Object.keys(c.past).length;
    if (!monthsWithData || !c.current) return;
    const avg = Object.values(c.past).reduce((s, v) => s + v, 0) / monthsWithData;
    if (c.current >= avg * SPIKE_RATIO && c.current - avg >= SPIKE_MIN_DIFF) {
      spikes.push({ name, current: c.current, avg, pct: round(((c.current - avg) / avg) * 100) });
    }
  });
  spikes.sort((a, b) => b.current - b.avg - (a.current - a.avg)).slice(0, 3).forEach((s) =>
    insights.push({ type: "warning", title: `Unusual spike in ${s.name}`,
      message: `${s.name} is at ${round(s.current)} this month, ${s.pct}% above your usual ${round(s.avg)} (3-month average).` })
  );

  /* Rule 3 - most frequently used expense categories (last 90 days, by number of transactions) */
  const freq = await Transaction.aggregate([
    { $match: { user: userId, type: "expense", date: { $gte: new Date(bounds.end.getTime() - 90 * 86400000), $lt: bounds.end } } },
    { $group: { _id: "$category", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
    { $unwind: "$cat" },
    { $sort: { count: -1 } },
    { $limit: 3 },
  ]);
  if (freq.length) {
    insights.push({ type: "info", title: "Your most frequent expenses",
      message: "Over the last 90 days you spend most often on: " +
        freq.map((f) => `${f.cat.name} (${f.count} transactions, ${round(f.total)})`).join(", ") + "." });
  }

  /* Rule 4 - where to cut: biggest discretionary categories this month */
  if (currentTotal > 0) {
    [...byCat.entries()]
      .filter(([name, c]) => c.current > 0 && !FIXED_CATEGORIES.includes(name.toLowerCase()))
      .map(([name, c]) => ({ name, amount: c.current, share: (c.current / currentTotal) * 100 }))
      .filter((c) => c.share >= BIG_SHARE_PCT)
      .sort((a, b) => b.share - a.share)
      .slice(0, 2)
      .forEach((c) =>
        insights.push({ type: "tip", title: `Consider trimming ${c.name}`,
          message: `${c.name} takes ${round(c.share)}% of your spending this month. Cutting it by ${CUT_PERCENT}% would save about ${round((c.amount * CUT_PERCENT) / 100)}.` })
      );
  }

  /* Rule 5 - budget overruns and near-limits */
  const budgets = await computeBudgets(req.user._id, month);
  budgets.filter((b) => b.status === "exceeded").forEach((b) =>
    insights.push({ type: "danger", title: `${b.category ? b.category.name : "Overall"} budget exceeded`,
      message: `You've spent ${b.spent} against a budget of ${b.amount} (${Math.abs(b.remaining)} over).` })
  );
  budgets.filter((b) => b.status === "warning").forEach((b) =>
    insights.push({ type: "warning", title: `${b.category ? b.category.name : "Overall"} budget nearly used`,
      message: `${b.percent}% used - only ${b.remaining} remaining this month.` })
  );

  /* Rule 6 - savings rate */
  const income = await Transaction.aggregate([
    { $match: { user: userId, type: "income", date: { $gte: bounds.start, $lt: bounds.end } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const monthIncome = income[0]?.total || 0;
  if (monthIncome > 0) {
    const rate = round(((monthIncome - currentTotal) / monthIncome) * 100);
    if (rate < 0) insights.push({ type: "danger", title: "You're spending more than you earn",
      message: `Expenses exceed income by ${round(currentTotal - monthIncome)} this month.` });
    else if (rate < LOW_SAVINGS_RATE) insights.push({ type: "warning", title: "Low savings rate",
      message: `You're saving ${rate}% of your income. Aim for at least ${GOOD_SAVINGS_RATE}%.` });
    else if (rate >= GOOD_SAVINGS_RATE) insights.push({ type: "success", title: "Healthy savings rate",
      message: `You're saving ${rate}% of your income this month.` });
  }

  res.json({ month, insights });
});
