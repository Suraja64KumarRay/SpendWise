import mongoose from "mongoose";

// Aggregation pipelines do NOT auto-cast strings to ObjectId like find() does.
export const oid = (id) => new mongoose.Types.ObjectId(String(id));

export const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Throw an HTTP error from inside a controller.
export const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};
