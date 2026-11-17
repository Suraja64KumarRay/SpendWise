import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import asyncHandler from "../utils/asyncHandler.js";
import { dateRange, parseDate } from "../utils/dates.js";
import { escapeRegex, fail } from "../utils/helpers.js";

const SORTABLE = ["date", "amount", "createdAt"];

// Builds the Mongo filter from query params; shared by list + CSV export.
export const buildFilter = (userId, q) => {
  const filter = { user: userId };
  if (["income", "expense"].includes(q.type)) filter.type = q.type;
  if (q.category) filter.category = q.category;
  const range = dateRange(q.from, q.to);
  if (range) filter.date = range;
  if (q.search) {
    const rx = new RegExp(escapeRegex(String(q.search)), "i");
    filter.$or = [{ description: rx }, { notes: rx }];
  }
  return filter;
};

// Makes sure the category belongs to this user and matches the transaction type.
const validateCategory = async (res, userId, categoryId, type) => {
  const cat = await Category.findOne({ _id: categoryId, user: userId });
  if (!cat) fail(res, 400, "Category not found");
  if (cat.type !== type) fail(res, 400, `Category "${cat.name}" is an ${cat.type} category`);
};

// GET /api/transactions?page=1&limit=10&sortBy=date&order=desc&type=&category=&from=&to=&search=
export const getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
  const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : "date";
  const order = req.query.order === "asc" ? 1 : -1;

  const filter = buildFilter(req.user._id, req.query);

  const [data, total] = await Promise.all([
    Transaction.find(filter)
      .populate("category", "name icon color type")
      // second sort key keeps pagination stable when many rows share a date
      .sort({ [sortBy]: order, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  res.json({ data, page, limit, total, pages: Math.ceil(total / limit) || 1 });
});

// POST /api/transactions
export const createTransaction = asyncHandler(async (req, res) => {
  const { type, amount, category, description, notes, date } = req.body;
  await validateCategory(res, req.user._id, category, type);

  const tx = await Transaction.create({
    user: req.user._id,
    type,
    amount,
    category,
    description,
    notes,
    date: parseDate(date) || parseDate(new Date().toISOString().slice(0, 10)),
  });
  res.status(201).json(await tx.populate("category", "name icon color type"));
});

// PUT /api/transactions/:id
export const updateTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!tx) fail(res, 404, "Transaction not found");

  const type = req.body.type ?? tx.type;
  const category = req.body.category ?? tx.category;
  await validateCategory(res, req.user._id, category, type);

  ["amount", "description", "notes"].forEach((f) => {
    if (req.body[f] !== undefined) tx[f] = req.body[f];
  });
  tx.type = type;
  tx.category = category;
  if (req.body.date) {
    const d = parseDate(req.body.date);
    if (!d) fail(res, 400, "Invalid date");
    tx.date = d;
  }

  await tx.save();
  res.json(await tx.populate("category", "name icon color type"));
});

// DELETE /api/transactions/:id
export const deleteTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!tx) fail(res, 404, "Transaction not found");
  res.json({ message: "Transaction deleted" });
});
