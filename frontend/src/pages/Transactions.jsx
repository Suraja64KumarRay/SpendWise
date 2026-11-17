import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api/axios.js";
import CategoryBadge from "../components/CategoryBadge.jsx";
import TransactionModal from "../components/TransactionModal.jsx";
import { moneyExact, formatDate } from "../utils/format.js";

const emptyFilters = { type: "", category: "", from: "", to: "", search: "" };

export default function Transactions() {
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState(emptyFilters);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState({ sortBy: "date", order: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ show: false, editing: null });

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...sort };
      Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
      const res = await api.get("/transactions", { params });
      setResult(res.data);
      setError("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, filters]);

  useEffect(() => { load(); }, [load]);

  const changeFilter = (field, value) => {
    setFilters((f) => ({ ...f, [field]: value }));
    setPage(1); // a new filter always starts from page 1
  };

  const toggleSort = (field) => {
    setSort((s) => ({ sortBy: field, order: s.sortBy === field && s.order === "desc" ? "asc" : "desc" }));
    setPage(1);
  };
  const arrow = (field) => (sort.sortBy === field ? (sort.order === "desc" ? " ▼" : " ▲") : "");

  const remove = async (t) => {
    if (!window.confirm(`Delete this ${t.type} of ${moneyExact(t.amount)}?`)) return;
    try {
      await api.delete(`/transactions/${t._id}`);
      // if we deleted the last row of a page, step back one page
      if (result.data.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const applySearch = (e) => {
    e.preventDefault();
    changeFilter("search", searchText.trim());
  };

  const clearAll = () => {
    setFilters(emptyFilters);
    setSearchText("");
    setPage(1);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Transactions</h4>
        <button className="btn btn-primary" onClick={() => setModal({ show: true, editing: null })}>+ Add transaction</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3"><div className="card-body">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">Type</label>
            <select className="form-select form-select-sm" value={filters.type} onChange={(e) => changeFilter("type", e.target.value)}>
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small mb-1">Category</label>
            <select className="form-select form-select-sm" value={filters.category} onChange={(e) => changeFilter("category", e.target.value)}>
              <option value="">All</option>
              {categories
                .filter((c) => !filters.type || c.type === filters.type)
                .map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name} ({c.type})</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">From</label>
            <input type="date" className="form-control form-control-sm" value={filters.from} onChange={(e) => changeFilter("from", e.target.value)} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small mb-1">To</label>
            <input type="date" className="form-control form-control-sm" value={filters.to} onChange={(e) => changeFilter("to", e.target.value)} />
          </div>
          <div className="col-12 col-md-3">
            <form onSubmit={applySearch} className="input-group input-group-sm">
              <input className="form-control" placeholder="Search description/notes" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              <button className="btn btn-outline-secondary">Search</button>
            </form>
          </div>
        </div>
        <button className="btn btn-link btn-sm px-0 mt-2" onClick={clearAll}>Clear filters</button>
      </div></div>

      <div className="card"><div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="sortable" onClick={() => toggleSort("date")}>Date{arrow("date")}</th>
                <th>Category</th>
                <th>Description</th>
                <th>Type</th>
                <th className="sortable text-end" onClick={() => toggleSort("amount")}>Amount{arrow("amount")}</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
              ) : result.data.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted py-4">No transactions found.</td></tr>
              ) : (
                result.data.map((t) => (
                  <tr key={t._id}>
                    <td className="text-nowrap">{formatDate(t.date)}</td>
                    <td><CategoryBadge category={t.category} /></td>
                    <td>
                      {t.description || <span className="text-muted">-</span>}
                      {t.notes && <div className="text-muted small">{t.notes}</div>}
                    </td>
                    <td><span className={`badge ${t.type === "income" ? "text-bg-success" : "text-bg-danger"}`}>{t.type}</span></td>
                    <td className={`text-end fw-semibold ${t.type === "income" ? "text-success" : "text-danger"}`}>
                      {t.type === "income" ? "+" : "-"}{moneyExact(t.amount)}
                    </td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setModal({ show: true, editing: t })}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(t)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="small text-muted">{result.total} transaction(s)</div>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm" style={{ width: 90 }} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span className="small">Page {page} of {result.pages}</span>
          <button className="btn btn-sm btn-outline-secondary" disabled={page >= result.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div></div>

      <TransactionModal
        show={modal.show}
        editing={modal.editing}
        categories={categories}
        onClose={() => setModal({ show: false, editing: null })}
        onSaved={load}
      />
    </>
  );
}
