export default function StatCard({ title, value, tone = "dark", hint }) {
  return (
    <div className="card stat-card h-100">
      <div className="card-body">
        <div className="text-muted small text-uppercase fw-semibold">{title}</div>
        <div className={`value text-${tone}`}>{value}</div>
        {hint && <div className="text-muted small">{hint}</div>}
      </div>
    </div>
  );
}
