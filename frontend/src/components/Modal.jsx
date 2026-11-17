// Small controlled Bootstrap modal (no Bootstrap JS needed).
export default function Modal({ show, title, onClose, children }) {
  if (!show) return null;
  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
