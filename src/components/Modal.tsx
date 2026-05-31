import { useEffect, useRef, useState } from "react";
import { getMealsForDate, saveMealsForDate } from "../storage";
import "./Modal.css";

interface MealEntry {
  time: string;
  description: string;
}

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
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [newTime, setNewTime] = useState("12:00");
  const [newDesc, setNewDesc] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    getMealsForDate(date).then((fetched) =>
      setMeals(fetched.map(({ time, description }) => ({ time, description }))),
    );
  }, [date]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function addMeal() {
    if (!newDesc.trim()) return;
    const entry: MealEntry = { time: newTime, description: newDesc.trim() };
    setMeals((prev) => {
      const without = prev.filter((m) => m.time !== newTime);
      return [...without, entry].sort((a, b) => a.time.localeCompare(b.time));
    });
    setNewDesc("");
  }

  function removeMeal(index: number) {
    setMeals((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveMealsForDate(date, meals);
    const value = parseFloat(weight);
    if (!isNaN(value) && value > 0) {
      onSave(value);
    }
    onClose();
  }

  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const weightValid = weight !== "" && parseFloat(weight) > 0;
  const canSave = weightValid || meals.length > 0;

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

          <div className="field">
            <span className="field-label">Meals</span>
            {meals.length > 0 && (
              <ul className="meals-list">
                {meals.map((meal, i) => (
                  <li key={meal.time} className="meal-row">
                    <span className="meal-time">{meal.time}</span>
                    <span className="meal-desc">{meal.description}</span>
                    <button
                      type="button"
                      className="meal-delete"
                      onClick={() => removeMeal(i)}
                      aria-label={`Remove meal at ${meal.time}`}
                    >
                      &#10005;
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="meal-add-row">
              <input
                type="time"
                className="meal-time-input"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                aria-label="Meal time"
              />
              <input
                type="text"
                className="meal-desc-input"
                placeholder="What did you eat?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMeal();
                  }
                }}
                aria-label="Meal description"
              />
              <button
                type="button"
                className="meal-add-btn"
                onClick={addMeal}
                disabled={!newDesc.trim()}
              >
                Add
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={!canSave}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
