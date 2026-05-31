import { useEffect, useRef, useState } from "react";
import { toDateKey, getDiaryEntry, saveDiaryEntry } from "../storage";
import "./Day.css";

interface MealEntry {
  time: string;
  description: string;
  calories: number | null;
}

interface DayProps {
  date: Date;
  onClose: () => void;
  onSaved?: () => void;
}

function parseCal(s: string): number | null {
  const v = parseInt(s, 10);
  return !isNaN(v) && v > 0 ? v : null;
}

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function Day({ date, onClose, onSaved }: DayProps) {
  const [weightStr, setWeightStr] = useState("");
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [newTime, setNewTime] = useState(nowHHMM);
  const [newDesc, setNewDesc] = useState("");
  const [newCalStr, setNewCalStr] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCalStr, setEditCalStr] = useState("");
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeightStr("");
    setMeals([]);
    setNewTime(nowHHMM());
    setNewDesc("");
    setNewCalStr("");
    setEditingIndex(null);
    getDiaryEntry(toDateKey(date)).then((entry) => {
      setWeightStr(entry?.weight != null ? String(entry.weight) : "");
      setMeals(
        (entry?.meals ?? []).map(({ time, description, calories }) => ({
          time,
          description,
          calories: calories ?? null,
        })),
      );
    });
  }, [date]);

  useEffect(() => {
    weightRef.current?.focus();
  }, [date]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (editingIndex !== null) {
        setEditingIndex(null);
      } else {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editingIndex]);

  function addMeal() {
    if (!newDesc.trim() || meals.some((m) => m.time === newTime)) return;
    const entry: MealEntry = {
      time: newTime,
      description: newDesc.trim(),
      calories: parseCal(newCalStr),
    };
    setMeals((prev) =>
      [...prev, entry].sort((a, b) => a.time.localeCompare(b.time)),
    );
    setNewDesc("");
    setNewCalStr("");
  }

  function removeMeal(index: number) {
    setMeals((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function startEdit(index: number, meal: MealEntry) {
    setEditingIndex(index);
    setEditTime(meal.time);
    setEditDesc(meal.description);
    setEditCalStr(meal.calories != null ? String(meal.calories) : "");
  }

  function confirmEdit() {
    if (editingIndex === null || !editDesc.trim()) {
      setEditingIndex(null);
      return;
    }
    const entry: MealEntry = {
      time: editTime,
      description: editDesc.trim(),
      calories: parseCal(editCalStr),
    };
    setMeals((prev) => {
      const filtered = prev.filter(
        (m, i) => i !== editingIndex && m.time !== editTime,
      );
      return [...filtered, entry].sort((a, b) => a.time.localeCompare(b.time));
    });
    setEditingIndex(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(weightStr);
    const weight = !isNaN(value) && value > 0 ? value : null;
    await saveDiaryEntry(toDateKey(date), { weight, meals });
    onSaved?.();
    onClose();
  }

  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const newTimeConflict = meals.some((m) => m.time === newTime);
  const weightValid = weightStr !== "" && parseFloat(weightStr) > 0;
  const canSave = weightValid || meals.length > 0;

  return (
    <div className="day-overlay" onPointerDown={onClose}>
      <div
        className="day-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-panel-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="day-panel-header">
          <h2 className="day-panel-title" id="day-panel-title">
            {label}
          </h2>
          <button
            className="day-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        <form className="day-body" onSubmit={handleSave}>
          <div className="day-field">
            <label className="day-field-label" htmlFor="day-weight">
              Weight
            </label>
            <div className="day-input-row">
              <input
                ref={weightRef}
                id="day-weight"
                type="number"
                className="day-input"
                placeholder="0.0"
                min="0"
                step="0.1"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value)}
              />
              <span className="day-input-unit">kg</span>
            </div>
          </div>

          <div className="day-field">
            <span className="day-field-label">Meals</span>
            {meals.length > 0 && (
              <ul className="day-meals">
                {meals.map((meal, i) =>
                  editingIndex === i ? (
                    <li key={i} className="day-meal-row day-meal-row--editing">
                      <input
                        type="time"
                        className="day-meal-time-input"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingIndex(null);
                          }
                        }}
                      />
                      <input
                        type="text"
                        className="day-meal-desc-input"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingIndex(null);
                          }
                        }}
                        autoFocus
                      />
                      <input
                        type="number"
                        className="day-meal-cal-input"
                        placeholder="kcal"
                        min="1"
                        step="1"
                        value={editCalStr}
                        onChange={(e) => setEditCalStr(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingIndex(null);
                          }
                        }}
                        aria-label="Calories"
                      />
                      <button
                        type="button"
                        className="day-meal-confirm"
                        onClick={confirmEdit}
                        aria-label="Confirm edit"
                      >
                        &#10003;
                      </button>
                      <button
                        type="button"
                        className="day-meal-cancel-edit"
                        onClick={() => setEditingIndex(null)}
                        aria-label="Cancel edit"
                      >
                        &#10005;
                      </button>
                    </li>
                  ) : (
                    <li key={i} className="day-meal-row">
                      <button
                        type="button"
                        className="day-meal-content"
                        onClick={() => startEdit(i, meal)}
                      >
                        <span className="day-meal-time">{meal.time}</span>
                        <span className="day-meal-desc">{meal.description}</span>
                        {meal.calories != null && (
                          <span className="day-meal-cal">
                            {meal.calories} kcal
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="day-meal-delete"
                        onClick={() => removeMeal(i)}
                        aria-label={`Remove meal at ${meal.time}`}
                      >
                        &#10005;
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
            <div className="day-meal-add">
              <input
                type="time"
                className="day-meal-time-input"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                aria-label="Meal time"
              />
              <input
                type="text"
                className="day-meal-desc-input"
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
              <input
                type="number"
                className="day-meal-cal-input"
                placeholder="kcal"
                min="1"
                step="1"
                value={newCalStr}
                onChange={(e) => setNewCalStr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMeal();
                  }
                }}
                aria-label="Calories"
              />
              <button
                type="button"
                className="day-meal-add-btn"
                onClick={addMeal}
                disabled={!newDesc.trim() || newTimeConflict}
              >
                Add
              </button>
            </div>
            {newTimeConflict && (
              <p className="day-meal-conflict">
                A meal at {newTime} already exists
              </p>
            )}
          </div>

          <div className="day-actions">
            <button type="button" className="day-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="day-btn-save" disabled={!canSave}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
