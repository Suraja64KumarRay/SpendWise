import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { errMsg } from "../api/axios.js";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap p-3">
      <div className="card p-4" style={{ width: 420, maxWidth: "100%" }}>
        <h3 className="fw-bold mb-1">Create your account</h3>
        <p className="text-muted">Start tracking with SpendWise</p>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" value={form.name} onChange={set("name")} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={form.email} onChange={set("email")} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" minLength={6} className="form-control" value={form.password} onChange={set("password")} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Confirm password</label>
            <input type="password" className="form-control" value={form.confirm} onChange={set("confirm")} required />
          </div>
          <button className="btn btn-primary w-100" disabled={busy}>
            {busy ? "Creating..." : "Register"}
          </button>
        </form>
        <p className="mt-3 mb-0 text-center small">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
