import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // null category = the overall monthly budget
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    month: { type: String, required: true, match: [/^\d{4}-\d{2}$/, "Month must be YYYY-MM"] },
    amount: { type: Number, required: [true, "Budget amount is required"], min: [1, "Budget must be at least 1"] },
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);
