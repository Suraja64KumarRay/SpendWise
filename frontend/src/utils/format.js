// Change CURRENCY / LOCALE here to switch the whole app (e.g. "USD" / "en-US").
const CURRENCY = "INR";
const LOCALE = "en-IN";

const moneyFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
const moneyFmtExact = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, minimumFractionDigits: 2 });

export const money = (n) => moneyFmt.format(Number(n) || 0);
export const moneyExact = (n) => moneyFmtExact.format(Number(n) || 0);

// Dates are stored as UTC midnight, so always format in UTC to avoid a one-day shift.
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(LOCALE, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export const toInputDate = (iso) => new Date(iso).toISOString().slice(0, 10);

// The user's *local* today / month (the server only knows UTC).
const pad = (n) => String(n).padStart(2, "0");
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const currentMonth = () => today().slice(0, 7);

export const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });
};

export const lastDayOfMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
};

export const PALETTE = ["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];
