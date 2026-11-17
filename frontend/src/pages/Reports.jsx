import { useState } from "react";
import api, { errMsg } from "../api/axios.js";
import StatCard from "../components/StatCard.jsx";
import { money, currentMonth, lastDayOfMonth, today } from "../utils/format.js";

export default function Reports() {
  const [kind, setKind] = useState("monthly");
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(today());
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // The same date window drives both the report and the CSV export.
  const window_ = () => {
    if (kind === "monthly") return { from: `${month}-01`, to: lastDayOfMonth(month) };
    if (kind === "yearly") return { from: `${year}-01-01`, to: `${year}-12-31` };
    return { from, to };
  };

  const generate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const params = kind === "monthly" ? { month } : kind === "yearly" ? { year } : { from, to };
      const res = await api.get(`/reports/${kind}`, { params });
      setReport(res.data);
    } catch (err) {
      setReport(null);
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // axios sends the JWT header, so download via blob instead of a plain <a href>.
  const exportCsv = async () => {
    try {
      const res = await api.get("/reports/export", { params: window_(), responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spendwise-${window_().from}_to_${window_().to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const s = report?.summary;

  return (
    <>
      <h4 className="fw-bold mb-3">Reports</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3"><div className="card-body">
        <form className="row g-2 align-items-end" onSubmit={generate}>
          <div className="col-md-3">
            <label className="form-label small mb-1">Report type</label>
            <select className="form-select" value={kind} onChange={(e) => { setKind(e.target.value); setReport(null); }}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom date range</option>
            </select>
          </div>
          {kind === "monthly" && (
            <div className="col-md-3"><label className="form-label small mb-1">Month</label><input type="month" className="form-control" value={month} onChange={(e) => setMonth(e.target.value)} required /></div>
          )}
          {kind === "yearly" && (
            <div className="col-md-3"><label className="form-label small mb-1">Year</label><input type="number" className="form-control" value={year} onChange={(e) => setYear(Number(e.target.value))} required /></div>
          )}
          {kind === "custom" && (
            <>
              <div className="col-md-3"><label className="form-label small mb-1">From</label><input type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} required /></div>
              <div className="col-md-3"><label className="form-label small mb-1">To</label><input type="date" className="form-control" value={to} onChange={(e) => setTo(e.target.value)} required /></div>
            </>
          )}
          <div className="col-md-3 d-flex gap-2">
            <button className="btn btn-primary" disabled={loading}>{loading ? "Generating..." : "Generate"}</button>
            <button type="button" className="btn btn-outline-success" onClick={exportCsv}>Export CSV</button>
          </div>
        </form>
      </div></div>

      {report && (
        <>
          <h6 className="fw-bold">Report: {report.period.label}</h6>
          <div className="row g-3 mb-3">
            <div className="col-6 col-lg-3"><StatCard title="Income" value={money(s.totalIncome)} tone="success" /></div>
            <div className="col-6 col-lg-3"><StatCard title="Expenses" value={money(s.totalExpense)} tone="danger" /></div>
            <div className="col-6 col-lg-3"><StatCard title="Savings" value={money(s.savings)} tone={s.savings >= 0 ? "primary" : "danger"} hint={`${s.savingsRate}% of income`} /></div>
            <div className="col-6 col-lg-3"><StatCard title="Transactions" value={s.transactionCount} hint={s.topExpenseCategory ? `Top spend: ${s.topExpenseCategory}` : ""} /></div>
          </div>

          <div className="row g-3">
            <div className="col-lg-6"><div className="card h-100"><div className="card-body">
              <h6 className="fw-bold">Expenses by category</h6>
              <CategoryTable rows={report.expenseByCategory} />
            </div></div></div>
            <div className="col-lg-6"><div className="card h-100"><div className="card-body">
              <h6 className="fw-bold">Income by category</h6>
              <CategoryTable rows={report.incomeByCategory} />
            </div></div></div>
            <div className="col-12"><div className="card"><div className="card-body">
              <h6 className="fw-bold">Month-by-month</h6>
              {report.byMonth.length === 0 ? <p className="text-muted mb-0">No data in this period.</p> : (
                <table className="table table-sm mb-0">
                  <thead><tr><th>Month</th><th className="text-end">Income</th><th className="text-end">Expense</th><th className="text-end">Savings</th></tr></thead>
                  <tbody>
                    {report.byMonth.map((m) => (
                      <tr key={m.month}><td>{m.month}</td><td className="text-end">{money(m.income)}</td><td className="text-end">{money(m.expense)}</td>
                        <td className={`text-end fw-semibold ${m.savings >= 0 ? "text-success" : "text-danger"}`}>{money(m.savings)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div></div></div>
          </div>
        </>
      )}
    </>
  );
}

function CategoryTable({ rows }) {
  if (!rows.length) return <p className="text-muted mb-0">No data in this period.</p>;
  return (
    <table className="table table-sm mb-0">
      <thead><tr><th>Category</th><th className="text-end">Amount</th><th className="text-end">Share</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}><td>{r.icon} {r.name}</td><td className="text-end">{money(r.total)}</td><td className="text-end text-muted">{r.percent}%</td></tr>
        ))}
      </tbody>
    </table>
  );
}
