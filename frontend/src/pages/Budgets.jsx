import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api/axios.js";
import { money, currentMonth, monthLabel } from "../utils/format.js";

const BAR = { ok: "bg-success", warning: "bg-warning", exceeded: "bg-danger" };

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState({ budgets: [], alerts: [] });
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category: "", amount: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/categories", { params: { type: "expense" } }).then((r) => setCategories(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  const load = useCallback(() => {
    if (!month) return;
    api.get("/budgets", { params: { month } })
      .then((r) => { setData(r.data); setError(""); })
      .catch((e) => setError(errMsg(e)));
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/budgets", { month, amount: Number(form.amount), category: form.category || null });
      setForm({ category: "", amount: "" });
      load();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const remove = async (b) => {
    if (!window.confirm("Delete this budget?")) return;
    try { await api.delete(`/budgets/${b._id}`); load(); } catch (err) { setError(errMsg(err)); }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Budgets</h4>
        <input type="month" className="form-control" style={{ width: 180 }} value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {data.alerts.map((a, i) => (
        <div key={i} className={`alert py-2 ${a.status === "exceeded" ? "alert-danger" : "alert-warning"}`}>
          {a.status === "exceeded" ? "🚨" : "⚠️"} {a.message}
        </div>
      ))}

      <div className="card mb-3"><div className="card-body">
        <h6 className="fw-bold">Set a budget for {month ? monthLabel(month) : "..."}</h6>
        <p className="text-muted small mb-2">Saving again for the same category and month updates the existing budget. Leave category empty for an overall monthly budget.</p>
        <form className="row g-2" onSubmit={save}>
          <div className="col-md-5">
            <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Overall monthly budget</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <input type="number" min="1" className="form-control" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="col-md-3"><button className="btn btn-primary w-100">Save budget</button></div>
        </form>
      </div></div>

      <div className="row g-3">
        {data.budgets.length === 0 && <p className="text-muted">No budgets for this month yet.</p>}
        {data.budgets.map((b) => (
          <div className="col-md-6" key={b._id}>
            <div className="card h-100"><div className="card-body">
              <div className="d-flex justify-content-between">
                <div className="fw-semibold">{b.category ? `${b.category.icon} ${b.category.name}` : "🎯 Overall budget"}</div>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(b)}>Delete</button>
              </div>
              <div className="progress my-3">
                <div className={`progress-bar ${BAR[b.status]}`} style={{ width: `${Math.min(b.percent, 100)}%` }} />
              </div>
              <div className="d-flex justify-content-between small">
                <span>Spent <strong>{money(b.spent)}</strong> of {money(b.amount)}</span>
                <span className="fw-semibold">{b.percent}%</span>
              </div>
              <div className={`small mt-1 ${b.remaining < 0 ? "text-danger" : "text-muted"}`}>
                {b.remaining >= 0 ? `${money(b.remaining)} remaining` : `${money(Math.abs(b.remaining))} over budget`}
              </div>
            </div></div>
          </div>
        ))}
      </div>
    </>
  );
}
