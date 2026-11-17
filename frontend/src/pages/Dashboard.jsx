import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import api, { errMsg } from "../api/axios.js";
import StatCard from "../components/StatCard.jsx";
import CategoryBadge from "../components/CategoryBadge.jsx";
import { money, formatDate, currentMonth, monthLabel } from "../utils/format.js";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const month = currentMonth();
    const year = Number(month.slice(0, 4));
    Promise.all([
      api.get("/analytics/summary", { params: { month } }),
      api.get("/analytics/monthly", { params: { year } }),
      api.get("/analytics/categories", { params: { type: "expense", month } }),
      api.get("/analytics/trends", { params: { period: "daily" } }),
    ])
      .then(([s, m, c, t]) => {
        setSummary(s.data);
        setMonthly(m.data.months);
        setCategories(c.data);
        setTrend(t.data.data.map((d) => ({ ...d, day: d.label.slice(5) })));
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!summary) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

  const savingsTone = summary.monthlySavings >= 0 ? "success" : "danger";

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-0">Dashboard</h4>
          <span className="text-muted small">{monthLabel(summary.month)}</span>
        </div>
        <Link to="/transactions" className="btn btn-primary btn-sm">+ Add transaction</Link>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><StatCard title="Total income" value={money(summary.totalIncome)} tone="success" hint="All time" /></div>
        <div className="col-6 col-lg-3"><StatCard title="Total expenses" value={money(summary.totalExpense)} tone="danger" hint="All time" /></div>
        <div className="col-6 col-lg-3"><StatCard title="Available balance" value={money(summary.balance)} tone={summary.balance >= 0 ? "primary" : "danger"} hint="Income - expenses" /></div>
        <div className="col-6 col-lg-3"><StatCard title="Monthly savings" value={money(summary.monthlySavings)} tone={savingsTone} hint="This month" /></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-8">
          <div className="card h-100"><div className="card-body">
            <h6 className="fw-bold">Monthly income vs expense</h6>
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div></div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100"><div className="card-body">
            <h6 className="fw-bold">Expenses by category</h6>
            {categories.length === 0 ? (
              <p className="text-muted mt-4">No expenses this month yet.</p>
            ) : (
              <div className="chart-box">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={categories} dataKey="total" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {categories.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div></div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card h-100"><div className="card-body">
            <h6 className="fw-bold">Spending trend (last 30 days)</h6>
            <div className="chart-box">
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" interval={4} />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="expense" name="Expense" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div></div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100"><div className="card-body">
            <div className="d-flex justify-content-between">
              <h6 className="fw-bold">Recent transactions</h6>
              <Link to="/transactions" className="small">View all</Link>
            </div>
            {summary.recent.length === 0 ? (
              <p className="text-muted mt-3">No transactions yet.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {summary.recent.map((t) => (
                  <li key={t._id} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <div>
                      <CategoryBadge category={t.category} />
                      <div className="text-muted small">{t.description || "-"} · {formatDate(t.date)}</div>
                    </div>
                    <strong className={t.type === "income" ? "text-success" : "text-danger"}>
                      {t.type === "income" ? "+" : "-"}{money(t.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </div></div>
        </div>
      </div>
    </>
  );
}
