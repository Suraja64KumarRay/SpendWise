import { useEffect, useState } from "react";
import api, { errMsg } from "../api/axios.js";
import { currentMonth, monthLabel } from "../utils/format.js";

const STYLE = {
  danger: { cls: "border-danger", icon: "🚨" },
  warning: { cls: "border-warning", icon: "⚠️" },
  success: { cls: "border-success", icon: "✅" },
  tip: { cls: "border-primary", icon: "💡" },
  info: { cls: "border-secondary", icon: "ℹ️" },
};

export default function Insights() {
  const [month, setMonth] = useState(currentMonth());
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!month) return;
    setInsights(null);
    api.get("/analytics/insights", { params: { month } })
      .then((r) => { setInsights(r.data.insights); setError(""); })
      .catch((e) => setError(errMsg(e)));
  }, [month]);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h4 className="fw-bold mb-0">Smart spending insights</h4>
        <input type="month" className="form-control" style={{ width: 180 }} value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <p className="text-muted small">Rule-based analysis of {month ? monthLabel(month) : "..."} compared with your recent history. No external AI is used.</p>

      {error && <div className="alert alert-danger">{error}</div>}
      {!insights && !error && <div className="text-center py-5"><div className="spinner-border text-primary" /></div>}
      {insights && insights.length === 0 && <p className="text-muted">Add some transactions to see insights.</p>}

      <div className="row g-3">
        {insights?.map((i, idx) => {
          const s = STYLE[i.type] || STYLE.info;
          return (
            <div className="col-md-6" key={idx}>
              <div className={`card h-100 border-start border-4 ${s.cls}`}>
                <div className="card-body">
                  <div className="fw-semibold mb-1">{s.icon} {i.title}</div>
                  <div className="text-muted">{i.message}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
