import { useEffect, useRef, useState } from "react";
import "./SaveMealComponentDialog.css";

interface SaveMealComponentDialogProps {
  initialName: string;
  onSave: (name: string, caloriesPerUnit: number) => void;
  onCancel: () => void;
}

export default function SaveMealComponentDialog({
  initialName,
  onSave,
  onCancel,
}: SaveMealComponentDialogProps) {
  const [name, setName] = useState(initialName);
  const [calStr, setCalStr] = useState("");
  const calRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    calRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cal = parseInt(calStr, 10);
    if (!name.trim() || isNaN(cal) || cal <= 0) return;
    onSave(name.trim(), cal);
  }

  const valid = name.trim() !== "" && parseInt(calStr, 10) > 0;

  return (
    <div className="mcd-overlay" onPointerDown={onCancel}>
      <div
        className="mcd-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcd-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mcd-header">
          <h2 className="mcd-title" id="mcd-title">
            New meal component
          </h2>
        </div>
        <form className="mcd-body" onSubmit={handleSubmit}>
          <div className="mcd-field">
            <label className="mcd-label" htmlFor="mcd-name">
              Name
            </label>
            <input
              id="mcd-name"
              type="text"
              className="mcd-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mcd-field">
            <label className="mcd-label" htmlFor="mcd-cal">
              Calories per unit
            </label>
            <div className="mcd-input-row">
              <input
                ref={calRef}
                id="mcd-cal"
                type="number"
                className="mcd-input"
                placeholder="0"
                min="1"
                step="1"
                value={calStr}
                onChange={(e) => setCalStr(e.target.value)}
              />
              <span className="mcd-input-unit">kcal</span>
            </div>
          </div>
          <div className="mcd-actions">
            <button type="button" className="mcd-btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="mcd-btn-save" disabled={!valid}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
