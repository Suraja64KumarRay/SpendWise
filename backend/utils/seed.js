// Creates a demo account with ~6 months of realistic data.
//   npm run seed        ->  login: demo@spendwise.com / Demo@1234
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import defaultCategories from "./defaultCategories.js";

dotenv.config();

const rand = (min, max) => Math.round(min + Math.random() * (max - min));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = "demo@spendwise.com";
  const old = await User.findOne({ email });
  if (old) {
    await Promise.all([
      Transaction.deleteMany({ user: old._id }),
      Budget.deleteMany({ user: old._id }),
      Category.deleteMany({ user: old._id }),
    ]);
    await old.deleteOne();
  }

  const user = await User.create({ name: "Demo User", email, password: "Demo@1234" });
  const cats = await Category.insertMany(defaultCategories.map((c) => ({ ...c, user: user._id })));
  const byName = Object.fromEntries(cats.map((c) => [c.name, c]));

  const now = new Date();
  const txs = [];
  const add = (type, cat, amount, y, m, d, description) =>
    txs.push({
      user: user._id, type, category: byName[cat]._id, amount, description,
      date: new Date(Date.UTC(y, m, d)),
    });

  for (let back = 5; back >= 0; back--) {
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const y = ref.getUTCFullYear();
    const m = ref.getUTCMonth();
    const lastDay = back === 0 ? now.getUTCDate() : new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

    if (lastDay >= 1) add("income", "Salary", 60000, y, m, 1, "Monthly salary");
    if (lastDay >= 10 && Math.random() > 0.4) add("income", "Freelance", rand(5000, 15000), y, m, 10, "Freelance project");
    if (lastDay >= 2) add("expense", "Rent", 15000, y, m, 2, "House rent");
    if (lastDay >= 5) add("expense", "Bills & Utilities", rand(2000, 3200), y, m, 5, "Electricity, internet, phone");

    for (let i = 0; i < rand(14, 20); i++) {
      const day = rand(1, lastDay);
      const kind = pick(["Food & Dining", "Food & Dining", "Food & Dining", "Transport", "Transport",
        "Shopping", "Entertainment", "Health", "Education", "Other"]);
      // make the current month's shopping spike so insights have something to say
      const boost = back === 0 && kind === "Shopping" ? 2.5 : 1;
      const ranges = {
        "Food & Dining": [150, 900], Transport: [50, 600], Shopping: [500, 3000],
        Entertainment: [200, 1500], Health: [300, 2000], Education: [500, 2500], Other: [100, 800],
      };
      add("expense", kind, Math.round(rand(...ranges[kind]) * boost), y, m, day, `${kind} expense`);
    }
  }
  await Transaction.insertMany(txs);

  const month = now.toISOString().slice(0, 7);
  await Budget.insertMany([
    { user: user._id, category: null, month, amount: 45000 },
    { user: user._id, category: byName["Food & Dining"]._id, month, amount: 6000 },
    { user: user._id, category: byName["Shopping"]._id, month, amount: 4000 },
    { user: user._id, category: byName["Entertainment"]._id, month, amount: 3000 },
  ]);

  console.log(`Seeded ${txs.length} transactions. Login: ${email} / Demo@1234`);
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
