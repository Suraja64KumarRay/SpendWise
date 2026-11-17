// All dates are handled in UTC so a "2026-11-15" transaction never shifts a day.

export const parseDate = (s) => {
  if (!s) return null;
  const str = String(s);
  const d = new Date(str.length === 10 ? `${str}T00:00:00.000Z` : str);
  return isNaN(d.getTime()) ? null : d;
};

// Inclusive range used by filters: from 00:00 of `from` to 23:59:59 of `to`.
export const dateRange = (from, to) => {
  const range = {};
  const f = parseDate(from);
  const t = parseDate(to);
  if (f) range.$gte = f;
  if (t) {
    if (String(to).length === 10) t.setUTCHours(23, 59, 59, 999);
    range.$lte = t;
  }
  return Object.keys(range).length ? range : null;
};

// "2026-11" -> { start: 2026-11-01, end: 2026-12-01 (exclusive) }
export const monthBounds = (month) => {
  const m = /^(\d{4})-(\d{2})$/.exec(month || "");
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) return null;
  return {
    start: new Date(Date.UTC(y, mo, 1)),
    end: new Date(Date.UTC(y, mo + 1, 1)),
  };
};

export const currentMonth = () => new Date().toISOString().slice(0, 7);

export const shiftMonth = (month, delta) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
};
