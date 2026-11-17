import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transactions", label: "Transactions" },
  { to: "/categories", label: "Categories" },
  { to: "/budgets", label: "Budgets" },
  { to: "/analytics", label: "Analytics" },
  { to: "/insights", label: "Insights" },
  { to: "/reports", label: "Reports" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg sw-navbar navbar-dark sticky-top">
        <div className="container">
          <span className="navbar-brand fw-bold">💸 SpendWise</span>
          <button className="navbar-toggler" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
            <ul className="navbar-nav me-auto gap-lg-1">
              {links.map((l) => (
                <li className="nav-item" key={l.to}>
                  <NavLink to={l.to} end={l.end} className="nav-link" onClick={() => setOpen(false)}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="d-flex align-items-center gap-3 text-white">
              <span className="small opacity-75">{user?.name}</span>
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
