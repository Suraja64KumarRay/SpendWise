import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api/axios.js";
import Modal from "../components/Modal.jsx";
import { money } from "../utils/format.js";

const ICONS = ["🍔", "🚗", "🛍️", "💡", "🎬", "🏥", "📚", "🏠", "📦", "☕", "✈️", "🎮", "🐶", "🎁", "💼", "💻", "📈", "💰", "🏋️", "📱", "👕", "🛒", "🎓", "🔧"];
const blank = { name: "", type: "expense", icon: "📦", color: "#6366f1" };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState("expense");
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ show: false, editing: null });
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState("");

  const load = useCallback(() => {
    api.get("/categories", { params: { withTotals: true } })
      .then((r) => setCategories(r.data))
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openModal = (editing = null) => {
    setFormError("");
    setForm(editing ? { name: editing.name, type: editing.type, icon: editing.icon, color: editing.color } : { ...blank, type: tab });
    setModal({ show: true, editing });
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (modal.editing) await api.put(`/categories/${modal.editing._id}`, form);
      else await api.post("/categories", form);
      setModal({ show: false, editing: null });
      load();
    } catch (err) {
      setFormError(errMsg(err));
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c._id}`);
      setError("");
      load();
    } catch (err) {
      setError(errMsg(err)); // e.g. "Cannot delete: 12 transaction(s) use this category"
    }
  };

  const list = categories.filter((c) => c.type === tab);
  const maxTotal = Math.max(...list.map((c) => c.total || 0), 1);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Categories</h4>
        <button className="btn btn-primary" onClick={() => openModal()}>+ New category</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <ul className="nav nav-pills mb-3">
        {["expense", "income"].map((t) => (
          <li className="nav-item" key={t}>
            <button className={`nav-link ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "expense" ? "Expense categories" : "Income categories"}
            </button>
          </li>
        ))}
      </ul>

      <div className="row g-3">
        {list.length === 0 && <p className="text-muted">No {tab} categories yet.</p>}
        {list.map((c) => (
          <div className="col-md-6 col-lg-4" key={c._id}>
            <div className="card h-100"><div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div className="d-flex align-items-center gap-2">
                  <span className="cat-dot" style={{ background: `${c.color}26`, width: 42, height: 42, fontSize: "1.3rem" }}>{c.icon}</span>
                  <div>
                    <div className="fw-semibold">{c.name}</div>
                    <div className="text-muted small">{c.count} transaction(s)</div>
                  </div>
                </div>
                <div>
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openModal(c)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c)}>Delete</button>
                </div>
              </div>
              <div className="mt-3 d-flex justify-content-between small">
                <span className="text-muted">{tab === "expense" ? "Total spent" : "Total earned"}</span>
                <strong>{money(c.total)}</strong>
              </div>
              <div className="progress mt-1">
                <div className="progress-bar" style={{ width: `${((c.total || 0) / maxTotal) * 100}%`, background: c.color }} />
              </div>
            </div></div>
          </div>
        ))}
      </div>

      <Modal show={modal.show} onClose={() => setModal({ show: false, editing: null })} title={modal.editing ? "Edit category" : "New category"}>
        <form onSubmit={save}>
          {formError && <div className="alert alert-danger py-2">{formError}</div>}
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          {!modal.editing && (
            <div className="mb-3">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Icon</label>
            <div className="d-flex flex-wrap gap-1">
              {ICONS.map((i) => (
                <button type="button" key={i} className={`btn emoji-btn ${form.icon === i ? "btn-primary" : "btn-light"}`} onClick={() => setForm({ ...form, icon: i })}>{i}</button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Color</label>
            <input type="color" className="form-control form-control-color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-light" onClick={() => setModal({ show: false, editing: null })}>Cancel</button>
            <button className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
