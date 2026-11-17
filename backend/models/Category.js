import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: [true, "Category name is required"], trim: true, maxlength: 40 },
    type: { type: String, enum: ["income", "expense"], required: true },
    icon: { type: String, default: "📦", maxlength: 8 },
    color: {
      type: String,
      default: "#64748b",
      match: [/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #ff8800"],
    },
  },
  { timestamps: true }
);

// A user cannot have two "Food" expense categories.
categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
