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

function nextMinute(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + 1;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function ghostEntry(afterTime?: string): MealEntry {
  return { time: afterTime ? nextMinute(afterTime) : nowHHMM(), description: "", calories: null };
}

export default function Day({ date, onClose, onSaved }: DayProps) {
  const [weightStr, setWeightStr] = useState("");
  // meals always ends with a ghost row (empty description and null calories)
  const [meals, setMeals] = useState<MealEntry[]>([ghostEntry()]);
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeightStr("");
    setMeals([ghostEntry()]);
    getDiaryEntry(toDateKey(date)).then((entry) => {
      setWeightStr(entry?.weight != null ? String(entry.weight) : "");
      const loaded = (entry?.meals ?? []).map(({ time, description, calories }) => ({
        time,
        description,
        calories: calories ?? null,
      }));
      const last = loaded[loaded.length - 1];
      setMeals([...loaded, ghostEntry(last?.time)]);
    });
  }, [date]);

  useEffect(() => {
    weightRef.current?.focus();
  }, [date]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function updateMeal(index: number, patch: Partial<MealEntry>) {
    setMeals((prev) => {
      const updated = prev.map((m, i) => (i === index ? { ...m, ...patch } : m));
      const isLast = index === prev.length - 1;
      if (isLast) {
        const was = prev[index];
        const now = updated[index];
        const wasEmpty = was.description.trim() === "" && was.calories === null;
        const hasContent = now.description.trim() !== "" || now.calories !== null;
        if (wasEmpty && hasContent) {
          return [...updated, ghostEntry(now.time)];
        }
      }
      return updated;
    });
  }

  function removeMeal(index: number) {
    setMeals((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(weightStr);
    const weight = !isNaN(value) && value > 0 ? value : null;
    const mealsToSave = meals
      .filter((m) => m.description.trim() !== "" || m.calories !== null)
      .sort((a, b) => a.time.localeCompare(b.time));
    await saveDiaryEntry(toDateKey(date), { weight, meals: mealsToSave });
    onSaved?.();
    onClose();
  }

  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const committed = meals.slice(0, -1);
  const mealTimes = committed.map((m) => m.time);
  const hasDuplicateTimes = mealTimes.length !== new Set(mealTimes).size;
  const weightValid = weightStr !== "" && parseFloat(weightStr) > 0;
  const canSave = (weightValid || committed.length > 0) && !hasDuplicateTimes;

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

            <ul className="day-meals">
              {meals.map((meal, i) => {
                const isGhost = i === meals.length - 1;
                return (
                  <li
                    key={i}
                    className={`day-meal-row${isGhost ? " day-meal-row--ghost" : ""}`}
                  >
                    <input
                      type="time"
                      className="day-meal-field day-meal-field--time"
                      value={meal.time}
                      onChange={(e) => updateMeal(i, { time: e.target.value })}
                      aria-label="Meal time"
                    />
                    <input
                      type="text"
                      className="day-meal-field day-meal-field--desc"
                      placeholder={isGhost ? "What did you eat?" : ""}
                      value={meal.description}
                      onChange={(e) =>
                        updateMeal(i, { description: e.target.value })
                      }
                      aria-label="Meal description"
                    />
                    <input
                      type="number"
                      className="day-meal-field day-meal-field--cal"
                      placeholder="kcal"
                      min="1"
                      step="1"
                      value={meal.calories != null ? String(meal.calories) : ""}
                      onChange={(e) =>
                        updateMeal(i, { calories: parseCal(e.target.value) })
                      }
                      aria-label="Calories"
                    />
                    {!isGhost && (
                      <button
                        type="button"
                        className="day-meal-delete"
                        onClick={() => removeMeal(i)}
                        aria-label={`Remove meal at ${meal.time}`}
                      >
                        &#10005;
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {hasDuplicateTimes && (
              <p className="day-meal-conflict">Two meals share the same time</p>
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
