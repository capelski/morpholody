import { useEffect, useRef, useState } from "react";
import { toDateKey, getDiaryEntry, saveDiaryEntry } from "../storage";
import "./Day.css";

interface ComponentEntry {
  name: string;
  quantity: string;
  calories: number | null;
}

interface MealEntry {
  time: string;
  components: ComponentEntry[];
}

interface DayProps {
  date: Date;
  onClose: () => void;
  onSaved?: () => void;
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

function parseCal(s: string): number | null {
  const v = parseInt(s, 10);
  return !isNaN(v) && v > 0 ? v : null;
}

function ghostComponent(): ComponentEntry {
  return { name: "", quantity: "", calories: null };
}

function ghostMeal(afterTime?: string): MealEntry {
  const now = nowHHMM();
  const time = afterTime === now ? nextMinute(afterTime) : now;
  return { time, components: [ghostComponent()] };
}

function isMealEmpty(meal: MealEntry): boolean {
  return meal.components.every((c) => c.name.trim() === "" && c.quantity.trim() === "");
}

export default function Day({ date, onClose, onSaved }: DayProps) {
  const [weightStr, setWeightStr] = useState("");
  const [meals, setMeals] = useState<MealEntry[]>([ghostMeal()]);
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeightStr("");
    setMeals([ghostMeal()]);
    getDiaryEntry(toDateKey(date)).then((entry) => {
      setWeightStr(entry?.weight != null ? String(entry.weight) : "");
      const loaded = (entry?.meals ?? []).map((m) => ({
        time: m.time,
        components:
          m.components && m.components.length > 0
            ? [...m.components.map((c) => ({ name: c.name, quantity: c.quantity, calories: c.calories ?? null })), ghostComponent()]
            : [ghostComponent()],
      }));
      const last = loaded[loaded.length - 1];
      setMeals([...loaded, ghostMeal(last?.time)]);
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

  function updateMealTime(mealIndex: number, time: string) {
    setMeals((prev) => prev.map((m, i) => (i === mealIndex ? { ...m, time } : m)));
  }

  function updateComponent(
    mealIndex: number,
    compIndex: number,
    patch: Partial<ComponentEntry>,
  ) {
    setMeals((prev) => {
      const updated = prev.map((meal, mi) => {
        if (mi !== mealIndex) return meal;
        const updatedComps = meal.components.map((c, ci) =>
          ci === compIndex ? { ...c, ...patch } : c,
        );
        const isLastComp = compIndex === meal.components.length - 1;
        const wasEmpty =
          meal.components[compIndex].name.trim() === "" &&
          meal.components[compIndex].quantity.trim() === "";
        const patchedComp = updatedComps[compIndex];
        const hasContent =
          patchedComp.name.trim() !== "" || patchedComp.quantity.trim() !== "";

        const newComps =
          isLastComp && wasEmpty && hasContent
            ? [...updatedComps, ghostComponent()]
            : updatedComps;

        return { ...meal, components: newComps };
      });

      // If the last meal was a ghost and now has content, append a new ghost meal
      const lastMeal = updated[updated.length - 1];
      const prevLastMeal = prev[prev.length - 1];
      if (isMealEmpty(prevLastMeal) && !isMealEmpty(lastMeal)) {
        return [...updated, ghostMeal(lastMeal.time)];
      }
      return updated;
    });
  }

  function removeComponent(mealIndex: number, compIndex: number) {
    setMeals((prev) =>
      prev.map((meal, mi) => {
        if (mi !== mealIndex) return meal;
        const filtered = meal.components.filter((_, ci) => ci !== compIndex);
        return { ...meal, components: filtered.length > 0 ? filtered : [ghostComponent()] };
      }),
    );
  }

  function removeMeal(mealIndex: number) {
    setMeals((prev) => prev.filter((_, i) => i !== mealIndex));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(weightStr);
    const weight = !isNaN(value) && value > 0 ? value : null;
    const mealsToSave = meals
      .filter((m) => !isMealEmpty(m))
      .map((m) => ({
        time: m.time,
        components: m.components.filter((c) => c.name.trim() !== "" || c.quantity.trim() !== ""),
      }))
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
              {meals.map((meal, mi) => {
                const isGhostMeal = mi === meals.length - 1;
                return (
                  <li
                    key={mi}
                    className={`day-meal-card${isGhostMeal ? " day-meal-card--ghost" : ""}`}
                  >
                    <div className="day-meal-header">
                      <input
                        type="time"
                        className="day-meal-field day-meal-field--time"
                        value={meal.time}
                        onChange={(e) => updateMealTime(mi, e.target.value)}
                        aria-label="Meal time"
                      />
                      {!isGhostMeal && (
                        <button
                          type="button"
                          className="day-meal-delete"
                          onClick={() => removeMeal(mi)}
                          aria-label={`Remove meal at ${meal.time}`}
                        >
                          &#10005;
                        </button>
                      )}
                    </div>

                    <ul className="day-components">
                      {meal.components.map((comp, ci) => {
                        const isGhostComp = ci === meal.components.length - 1;
                        return (
                          <li key={ci} className="day-component-row">
                            <input
                              type="text"
                              className="day-meal-field day-component-field--name"
                              placeholder={isGhostComp ? "Component" : ""}
                              value={comp.name}
                              onChange={(e) =>
                                updateComponent(mi, ci, { name: e.target.value })
                              }
                              aria-label="Component name"
                            />
                            <input
                              type="text"
                              className="day-meal-field day-component-field--qty"
                              placeholder={isGhostComp ? "Qty" : ""}
                              value={comp.quantity}
                              onChange={(e) =>
                                updateComponent(mi, ci, { quantity: e.target.value })
                              }
                              aria-label="Quantity"
                            />
                            <input
                              type="number"
                              className="day-meal-field day-component-field--cal"
                              placeholder="kcal"
                              min="1"
                              step="1"
                              value={comp.calories != null ? String(comp.calories) : ""}
                              onChange={(e) =>
                                updateComponent(mi, ci, { calories: parseCal(e.target.value) })
                              }
                              aria-label="Calories"
                            />
                            {!isGhostComp && (
                              <button
                                type="button"
                                className="day-meal-delete"
                                onClick={() => removeComponent(mi, ci)}
                                aria-label={`Remove ${comp.name}`}
                              >
                                &#10005;
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
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
