// Wraps async controllers so thrown errors reach the central error handler
// (no try/catch boilerplate in every controller).
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
