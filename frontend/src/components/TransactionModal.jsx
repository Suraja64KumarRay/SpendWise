import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import api, { errMsg } from "../api/axios.js";
import { today, toInputDate } from "../utils/format.js";

const empty = () => ({ type: "expense", amount: "", category: "", description: "", notes: "", date: today() });

// Used for both "Add" (editing = null) and "Edit".
export default function TransactionModal({ show, onClose, onSaved, editing, categories }) {
  const [form, setForm] = useState(empty());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    setError("");
    setForm(
      editing
        ? {
            type: editing.type,
            amount: editing.amount,
            category: editing.category?._id || "",
            description: editing.description || "",
            notes: editing.notes || "",
            date: toInputDate(editing.date),
          }
        : empty()
    );
  }, [show, editing]);

  const options = categories.filter((c) => c.type === form.type);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const changeType = (type) => setForm({ ...form, type, category: "" }); // category must match type

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) await api.put(`/transactions/${editing._id}`, payload);
      else await api.post("/transactions", payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title={editing ? "Edit transaction" : "Add transaction"}>
      <form onSubmit={submit}>
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="btn-group w-100 mb-3">
          <button type="button" className={`btn ${form.type === "expense" ? "btn-danger" : "btn-outline-danger"}`} onClick={() => changeType("expense")}>
            Expense
          </button>
          <button type="button" className={`btn ${form.type === "income" ? "btn-success" : "btn-outline-success"}`} onClick={() => changeType("income")}>
            Income
          </button>
        </div>

        <div className="row g-3">
          <div className="col-6">
            <label className="form-label">Amount</label>
            <input type="number" min="0.01" step="0.01" className="form-control" value={form.amount} onChange={set("amount")} required />
          </div>
          <div className="col-6">
            <label className="form-label">Date</label>
            <input type="date" className="form-control" value={form.date} onChange={set("date")} required />
          </div>
          <div className="col-12">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={set("category")} required>
              <option value="">Select a category</option>
              {options.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <input className="form-control" maxLength={120} value={form.description} onChange={set("description")} placeholder="e.g. Lunch with team" />
          </div>
          <div className="col-12">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows="2" maxLength={500} value={form.notes} onChange={set("notes")} />
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
