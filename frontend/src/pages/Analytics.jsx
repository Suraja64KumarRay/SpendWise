import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import api, { errMsg } from "../api/axios.js";
import StatCard from "../components/StatCard.jsx";
import { money, currentMonth } from "../utils/format.js";

const TABS = [
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" },
  { id: "yearly", label: "Yearly" },
  { id: "categories", label: "Categories" },
];

const Chart = ({ children }) => <div className="chart-box"><ResponsiveContainer>{children}</ResponsiveContainer></div>;
const axisMoney = (v) => (v >= 1000 ? `${v / 1000}k` : v);

const Change = ({ pct, inverse }) => {
  if (pct === null || pct === undefined) return <span className="text-muted">-</span>;
  // for expenses an increase is bad, for income it's good
  const good = inverse ? pct <= 0 : pct >= 0;
  return <span className={good ? "text-success" : "text-danger"}>{pct > 0 ? "+" : ""}{pct}%</span>;
};

export default function Analytics() {
  const [tab, setTab] = useState("monthly");
  const [year, setYear] = useState(Number(currentMonth().slice(0, 4)));
  const [range, setRange] = useState({ from: "", to: "" });
  const [months, setMonths] = useState([]);
  const [trend, setTrend] = useState([]);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    const fail = (e) => setError(errMsg(e));
    if (tab === "monthly") api.get("/analytics/monthly", { params: { year } }).then((r) => setMonths(r.data.months)).catch(fail);
    if (tab === "weekly") api.get("/analytics/trends", { params: { period: "weekly" } }).then((r) => setTrend(r.data.data)).catch(fail);
    if (tab === "yearly") api.get("/analytics/trends", { params: { period: "yearly" } }).then((r) => setTrend(r.data.data)).catch(fail);
    if (tab === "categories") {
      const params = { type: "expense" };
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      api.get("/analytics/categories", { params }).then((r) => setCats(r.data)).catch(fail);
    }
  }, [tab, year, range]);

  const withData = months.filter((m) => m.income || m.expense);
  const totalSaved = months.reduce((s, m) => s + m.savings, 0);
  const best = withData.length ? withData.reduce((a, b) => (b.savings > a.savings ? b : a)) : null;
  const avgSavings = withData.length ? totalSaved / withData.length : 0;

  return (
    <>
      <h4 className="fw-bold mb-3">Financial analytics</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      <ul className="nav nav-pills mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.id}>
            <button className={`nav-link ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          </li>
        ))}
      </ul>

      {tab === "monthly" && (
        <>
          <div className="d-flex align-items-center gap-2 mb-3">
            <label className="small text-muted">Year</label>
            <input type="number" className="form-control" style={{ width: 110 }} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-4"><StatCard title="Saved this year" value={money(totalSaved)} tone={totalSaved >= 0 ? "success" : "danger"} /></div>
            <div className="col-md-4"><StatCard title="Avg monthly savings" value={money(avgSavings)} tone="primary" hint="Months with activity" /></div>
            <div className="col-md-4"><StatCard title="Best savings month" value={best ? best.label : "-"} tone="dark" hint={best ? money(best.savings) : ""} /></div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-6"><div className="card"><div className="card-body">
              <h6 className="fw-bold">Income vs expense</h6>
              <Chart>
                <BarChart data={months}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={axisMoney} />
                  <Tooltip formatter={(v) => money(v)} /><Legend />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </Chart>
            </div></div></div>
            <div className="col-lg-6"><div className="card"><div className="card-body">
              <h6 className="fw-bold">Savings analysis</h6>
              <Chart>
                <LineChart data={months}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={axisMoney} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="savings" name="Savings" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </Chart>
            </div></div></div>
          </div>

          <div className="card"><div className="card-body">
            <h6 className="fw-bold">Monthly comparison</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead><tr><th>Month</th><th className="text-end">Income</th><th className="text-end">vs prev</th><th className="text-end">Expense</th><th className="text-end">vs prev</th><th className="text-end">Savings</th></tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td>{m.label}</td>
                      <td className="text-end">{money(m.income)}</td>
                      <td className="text-end"><Change pct={m.incomeChangePct} /></td>
                      <td className="text-end">{money(m.expense)}</td>
                      <td className="text-end"><Change pct={m.expenseChangePct} inverse /></td>
                      <td className={`text-end fw-semibold ${m.savings >= 0 ? "text-success" : "text-danger"}`}>{money(m.savings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div></div>
        </>
      )}

      {(tab === "weekly" || tab === "yearly") && (
        <div className="card"><div className="card-body">
          <h6 className="fw-bold">{tab === "weekly" ? "Weekly report (last 12 weeks)" : "Yearly report"}</h6>
          {trend.length === 0 ? <p className="text-muted">No data yet.</p> : (
            <Chart>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis tickFormatter={axisMoney} />
                <Tooltip formatter={(v) => money(v)} /><Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </Chart>
          )}
        </div></div>
      )}

      {tab === "categories" && (
        <>
          <div className="row g-2 mb-3" style={{ maxWidth: 440 }}>
            <div className="col"><label className="small text-muted">From</label><input type="date" className="form-control" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
            <div className="col"><label className="small text-muted">To</label><input type="date" className="form-control" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
          </div>
          {cats.length === 0 ? <p className="text-muted">No expenses in this range.</p> : (
            <div className="row g-3">
              <div className="col-lg-6"><div className="card"><div className="card-body">
                <h6 className="fw-bold">Category-wise spending</h6>
                <Chart>
                  <PieChart>
                    <Pie data={cats} dataKey="total" nameKey="name" outerRadius={100} label={(e) => `${e.percent}%`}>
                      {cats.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} /><Legend />
                  </PieChart>
                </Chart>
              </div></div></div>
              <div className="col-lg-6"><div className="card"><div className="card-body">
                <h6 className="fw-bold">Highest spending categories</h6>
                <ol className="list-group list-group-numbered list-group-flush">
                  {cats.slice(0, 6).map((c) => (
                    <li key={c.name} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{c.icon} {c.name} <span className="text-muted small">({c.count} txns)</span></span>
                      <span><strong>{money(c.total)}</strong> <span className="text-muted small">{c.percent}%</span></span>
                    </li>
                  ))}
                </ol>
              </div></div></div>
            </div>
          )}
        </>
      )}
    </>
  );
}
