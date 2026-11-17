import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: [true, "Amount is required"], min: [0.01, "Amount must be greater than 0"] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: [true, "Category is required"] },
    description: { type: String, trim: true, maxlength: 120, default: "" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// Almost every query filters by user and sorts/filters by date.
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });

export default mongoose.model("Transaction", transactionSchema);
