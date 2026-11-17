export default function CategoryBadge({ category }) {
  if (!category) return <span className="text-muted">Uncategorized</span>;
  return (
    <span className="d-inline-flex align-items-center gap-2">
      <span className="cat-dot" style={{ background: `${category.color}26` }}>
        {category.icon}
      </span>
      <span>{category.name}</span>
    </span>
  );
}
