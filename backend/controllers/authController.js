import User from "../models/User.js";
import Category from "../models/Category.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import defaultCategories from "../utils/defaultCategories.js";
import { fail } from "../utils/helpers.js";

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) fail(res, 400, "Name, email and password are required");

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) fail(res, 409, "An account with this email already exists");

  const user = await User.create({ name, email, password });

  // Give the new user a starter set of categories.
  await Category.insertMany(defaultCategories.map((c) => ({ ...c, user: user._id })));

  res.status(201).json({ token: generateToken(user._id), user: userPayload(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) fail(res, 400, "Email and password are required");

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
  // Same message for "no user" and "wrong password" so attackers can't enumerate emails.
  if (!user || !(await user.matchPassword(password))) fail(res, 401, "Invalid email or password");

  res.json({ token: generateToken(user._id), user: userPayload(user) });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: userPayload(req.user) });
});
