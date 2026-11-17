import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import asyncHandler from "../utils/asyncHandler.js";
import { fail, oid, round } from "../utils/helpers.js";

// GET /api/categories?type=expense&withTotals=true
export const getCategories = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (["income", "expense"].includes(req.query.type)) filter.type = req.query.type;

  const categories = await Category.find(filter).sort({ type: 1, name: 1 }).lean();

  if (req.query.withTotals === "true") {
    const rows = await Transaction.aggregate([
      { $match: { user: oid(req.user._id) } },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const map = new Map(rows.map((r) => [String(r._id), r]));
    categories.forEach((c) => {
      const r = map.get(String(c._id));
      c.total = r ? round(r.total) : 0;
      c.count = r ? r.count : 0;
    });
  }

  res.json(categories);
});

// POST /api/categories
export const createCategory = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.body;
  const category = await Category.create({ user: req.user._id, name, type, icon, color });
  res.status(201).json(category);
});

// PUT /api/categories/:id
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
  if (!category) fail(res, 404, "Category not found");

  const { name, icon, color } = req.body;
  // `type` is intentionally not editable: it would silently turn past
  // income transactions into expenses and corrupt every total.
  if (name !== undefined) category.name = name;
  if (icon !== undefined) category.icon = icon;
  if (color !== undefined) category.color = color;

  await category.save();
  res.json(category);
});

// DELETE /api/categories/:id
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
  if (!category) fail(res, 404, "Category not found");

  const used = await Transaction.countDocuments({ user: req.user._id, category: category._id });
  if (used > 0) {
    fail(res, 409, `Cannot delete: ${used} transaction(s) use this category. Re-assign or delete them first.`);
  }

  await Budget.deleteMany({ user: req.user._id, category: category._id });
  await category.deleteOne();
  res.json({ message: "Category deleted" });
});
