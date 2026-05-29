import { useEffect, useRef, useState } from "react";
import "./Modal.css";

interface ModalProps {
  date: Date;
  initialWeight: number | null;
  onClose: () => void;
  onSave: (weight: number) => void;
}

export default function Modal({
  date,
  initialWeight,
  onClose,
  onSave,
}: ModalProps) {
  const [weight, setWeight] = useState(
    initialWeight !== null ? String(initialWeight) : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(weight);
    if (!isNaN(value) && value > 0) {
      onSave(value);
      onClose();
    }
  }

  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="modal-title">
              Add data
            </h2>
            <p className="modal-date">{label}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &#10005;
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="weight-input">
              Weight
            </label>
            <div className="field-input-row">
              <input
                ref={inputRef}
                id="weight-input"
                type="number"
                className="field-input"
                placeholder="0.0"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <span className="field-unit">kg</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={weight === "" || parseFloat(weight) <= 0}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
