import { useEffect, useRef, useState } from 'react';
import {
  getDiaryEntry,
  saveDiaryEntry,
  getMealComponentSuggestions,
  saveMealComponent,
  getMealComponentById,
} from '../storage';
import SaveMealComponentDialog from './SaveMealComponentDialog';
import './Day.css';
import { toDateKey } from '../logic/date';

interface ComponentEntry {
  id: string | null;
  name: string;
  quantity: number | null;
  calories: number | null;
  caloriesPerUnit: number | null;
  units?: string;
  ingredientId: string | null;
}

interface MealEntry {
  id: string | null;
  time: string;
  components: ComponentEntry[];
}

interface DayProps {
  date: Date;
  onClose: () => void;
  onSaved?: () => void;
  onDateChange?: (date: Date) => void;
}

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function nextMinute(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + 1;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function parseCal(s: string): number | null {
  const v = parseInt(s, 10);
  return !isNaN(v) && v > 0 ? v : null;
}

function parseQty(s: string): number | null {
  const v = parseFloat(s);
  return !isNaN(v) && v > 0 ? v : null;
}

function ghostComponent(): ComponentEntry {
  return {
    id: null,
    name: '',
    quantity: null,
    calories: null,
    caloriesPerUnit: null,
    ingredientId: null,
  };
}

function ghostMeal(afterTime?: string): MealEntry {
  const now = nowHHMM();
  const time = afterTime === now ? nextMinute(afterTime) : now;
  return { id: null, time, components: [ghostComponent()] };
}

function isMealEmpty(meal: MealEntry): boolean {
  return meal.components.every((c) => c.name.trim() === '' && c.quantity == null);
}

export default function Day({ date, onClose, onSaved, onDateChange }: DayProps) {
  const [weightStr, setWeightStr] = useState('');
  const [meals, setMeals] = useState<MealEntry[]>([ghostMeal()]);
  const [editingMeals, setEditingMeals] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<{
    mi: number;
    ci: number;
    items: {
      id: string;
      name: string;
      caloriesPerUnit: number;
      units?: string;
    }[];
    active: number;
    hasExactMatch: boolean;
  } | null>(null);
  const [savingComponent, setSavingComponent] = useState<{
    name: string;
    mi: number;
    ci: number;
  } | null>(null);
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeightStr('');
    setMeals([ghostMeal()]);
    setEditingMeals(false);
    getDiaryEntry(toDateKey(date)).then(async (entry) => {
      setWeightStr(entry?.weight != null ? String(entry.weight) : '');
      const loadedMeals = await Promise.all(
        (entry?.meals ?? []).map(async (m) => ({
          id: m.id ?? null,
          time: m.time,
          components:
            m.components && m.components.length > 0
              ? [
                  ...(await Promise.all(
                    m.components.map(async (c) => {
                      let caloriesPerUnit: number | null = null;
                      if (c.ingredientId) {
                        const mc = await getMealComponentById(c.ingredientId);
                        caloriesPerUnit = mc?.caloriesPerUnit ?? null;
                      }
                      return {
                        id: c.id ?? null,
                        name: c.name,
                        quantity: c.ingredientId ? c.quantity : null,
                        calories: c.calories ?? null,
                        caloriesPerUnit,
                        ingredientId: c.ingredientId ?? null,
                      };
                    }),
                  )),
                  ghostComponent(),
                ]
              : [ghostComponent()],
        })),
      );
      const last = loadedMeals[loadedMeals.length - 1];
      setMeals([...loadedMeals, ghostMeal(last?.time)]);
    });
  }, [date]);

  useEffect(() => {
    weightRef.current?.focus();
  }, [date]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function updateMealTime(mealIndex: number, time: string) {
    setMeals((prev) => prev.map((m, i) => (i === mealIndex ? { ...m, time } : m)));
  }

  function updateComponent(mealIndex: number, compIndex: number, patch: Partial<ComponentEntry>) {
    setMeals((prev) => {
      const updated = prev.map((meal, mi) => {
        if (mi !== mealIndex) return meal;
        const updatedComps = meal.components.map((c, ci) =>
          ci === compIndex ? { ...c, ...patch } : c,
        );
        const isLastComp = compIndex === meal.components.length - 1;
        const wasEmpty =
          meal.components[compIndex].name.trim() === '' &&
          meal.components[compIndex].quantity == null;
        const patchedComp = updatedComps[compIndex];
        const hasContent = patchedComp.name.trim() !== '' || patchedComp.quantity != null;

        const newComps =
          isLastComp && wasEmpty && hasContent ? [...updatedComps, ghostComponent()] : updatedComps;

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
        return {
          ...meal,
          components: filtered.length > 0 ? filtered : [ghostComponent()],
        };
      }),
    );
  }

  function removeMeal(mealIndex: number) {
    setMeals((prev) => prev.filter((_, i) => i !== mealIndex));
  }

  async function handleNameChange(mi: number, ci: number, value: string) {
    updateComponent(mi, ci, { name: value });
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const items = await getMealComponentSuggestions(trimmed);
      const hasExactMatch = items.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      setNameSuggestions({ mi, ci, items, active: -1, hasExactMatch });
    } else {
      setNameSuggestions(null);
    }
  }

  function selectSuggestion(suggestion: {
    id: string;
    name: string;
    caloriesPerUnit: number;
    units?: string;
  }) {
    if (!nameSuggestions) return;
    const { mi, ci } = nameSuggestions;
    const qty = meals[mi].components[ci].quantity;
    const calories = qty != null ? Math.round(suggestion.caloriesPerUnit * qty) : null;
    updateComponent(mi, ci, {
      name: suggestion.name,
      caloriesPerUnit: suggestion.caloriesPerUnit,
      calories,
      units: suggestion.units,
      ingredientId: suggestion.id,
    });
    setNameSuggestions(null);
  }

  function saveAndSelectNew(name: string, mi: number, ci: number) {
    setNameSuggestions(null);
    setSavingComponent({ name, mi, ci });
  }

  async function handleSaveMealComponent(name: string, caloriesPerUnit: number, units: string) {
    const ingredientId = await saveMealComponent(name, caloriesPerUnit, units);
    if (savingComponent) {
      const qty = meals[savingComponent.mi].components[savingComponent.ci].quantity;
      const calories = qty != null ? Math.round(caloriesPerUnit * qty) : null;
      updateComponent(savingComponent.mi, savingComponent.ci, {
        caloriesPerUnit,
        calories,
        ingredientId,
      });
    }
    setSavingComponent(null);
  }

  function handleQuantityChange(mi: number, ci: number, value: string) {
    const quantity = parseQty(value);
    const cpu = meals[mi].components[ci].caloriesPerUnit;
    const patch: Partial<ComponentEntry> = { quantity };
    if (cpu != null) {
      patch.calories = quantity != null ? Math.round(cpu * quantity) : null;
    }
    updateComponent(mi, ci, patch);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!nameSuggestions) return;
    const addIdx = nameSuggestions.hasExactMatch ? -1 : nameSuggestions.items.length;
    const lastIdx = nameSuggestions.items.length - 1 + (nameSuggestions.hasExactMatch ? 0 : 1);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setNameSuggestions((prev) =>
        prev ? { ...prev, active: Math.min(prev.active + 1, lastIdx) } : prev,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setNameSuggestions((prev) =>
        prev ? { ...prev, active: Math.max(prev.active - 1, -1) } : prev,
      );
    } else if (e.key === 'Enter' && nameSuggestions.active >= 0) {
      e.preventDefault();
      if (nameSuggestions.active === addIdx) {
        const name = meals[nameSuggestions.mi].components[nameSuggestions.ci].name.trim();
        if (name) saveAndSelectNew(name, nameSuggestions.mi, nameSuggestions.ci);
      } else {
        selectSuggestion(nameSuggestions.items[nameSuggestions.active]);
      }
    } else if (e.key === 'Escape') {
      setNameSuggestions(null);
    }
  }

  function handleNameBlur() {
    setTimeout(() => setNameSuggestions(null), 120);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(weightStr);
    const weight = !isNaN(value) && value > 0 ? value : null;
    const mealsToSave = meals
      .filter((m) => !isMealEmpty(m))
      .map((m) => ({
        id: m.id ?? crypto.randomUUID(),
        time: m.time,
        components: m.components
          .filter((c) => c.name.trim() !== '' || c.quantity != null)
          .map((c) => {
            const id = c.id ?? crypto.randomUUID();
            if (c.ingredientId) {
              return {
                id,
                name: c.name,
                calories: c.calories,
                quantity: c.quantity,
                ingredientId: c.ingredientId,
                caloriesPerUnit: c.caloriesPerUnit ?? 0,
                ...(c.units ? { units: c.units } : {}),
              };
            }
            return {
              id,
              name: c.name,
              calories: c.calories,
              quantity: c.quantity,
            };
          }),
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
    await saveDiaryEntry(toDateKey(date), { weight, meals: mealsToSave });
    onSaved?.();
    onClose();
  }

  const label = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const committed = meals.slice(0, -1);
  const mealTimes = committed.map((m) => m.time);
  const hasDuplicateTimes = mealTimes.length !== new Set(mealTimes).size;
  const weightValid = weightStr !== '' && parseFloat(weightStr) > 0;
  const canSave = (weightValid || committed.length > 0) && !hasDuplicateTimes;
  const dayCalories = meals.reduce<number | null>((daySum, meal) => {
    const mealTotal = meal.components.reduce<number | null>((s, c) => {
      if (c.calories == null) return s;
      return (s ?? 0) + c.calories;
    }, null);
    if (mealTotal == null) return daySum;
    return (daySum ?? 0) + mealTotal;
  }, null);

  return (
    <>
      <div className="day-overlay" onPointerDown={onClose}>
        <div
          className="day-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-panel-title"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="day-panel-header">
            {onDateChange && (
              <button
                className="day-panel-nav"
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() - 1);
                  onDateChange(d);
                }}
                aria-label="Previous day"
              >
                &#8249;
              </button>
            )}
            <h2 className="day-panel-title" id="day-panel-title">
              {label}
            </h2>
            {onDateChange && (
              <button
                className="day-panel-nav"
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() + 1);
                  onDateChange(d);
                }}
                aria-label="Next day"
              >
                &#8250;
              </button>
            )}
            <button className="day-panel-close" onClick={onClose} aria-label="Close">
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
              <div className="day-meals-label-row">
                <span className="day-field-label">Meals</span>
                <div className="day-meals-label-right">
                  {dayCalories != null && (
                    <span className="day-field-label day-day-total">{dayCalories} kcal</span>
                  )}
                  <button
                    type="button"
                    className={`day-meals-edit-btn${editingMeals ? ' day-meals-edit-btn--active' : ''}`}
                    onClick={() => setEditingMeals((v) => !v)}
                    aria-label={editingMeals ? 'Stop editing meals' : 'Edit meals'}
                  >
                    ✏️
                  </button>
                </div>
              </div>

              <ul className="day-meals">
                {meals.map((meal, mi) => {
                  const isGhostMeal = mi === meals.length - 1;
                  if (isGhostMeal && !editingMeals) return null;
                  return (
                    <li
                      key={mi}
                      className={`day-meal-card${isGhostMeal ? ' day-meal-card--ghost' : ''}`}
                    >
                      <div className="day-meal-header">
                        <input
                          type="time"
                          className="day-meal-field day-meal-field--time"
                          value={meal.time}
                          onChange={(e) => editingMeals && updateMealTime(mi, e.target.value)}
                          readOnly={!editingMeals}
                          aria-label="Meal time"
                        />
                        {!isGhostMeal &&
                          (() => {
                            const total = meal.components.reduce<number | null>((s, c) => {
                              if (c.calories == null) return s;
                              return (s ?? 0) + c.calories;
                            }, null);
                            return total != null ? (
                              <span className="day-meal-total">{total} kcal</span>
                            ) : null;
                          })()}
                        {!isGhostMeal && editingMeals && (
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
                          if (isGhostComp && !editingMeals) return null;
                          return (
                            <li key={ci} className="day-component-row">
                              <div className="day-component-name-wrapper">
                                {editingMeals ? (
                                  <input
                                    type="text"
                                    className="day-meal-field day-component-field--name"
                                    placeholder={isGhostComp ? 'Component' : ''}
                                    value={comp.name}
                                    onChange={(e) => handleNameChange(mi, ci, e.target.value)}
                                    onKeyDown={handleNameKeyDown}
                                    onBlur={handleNameBlur}
                                    aria-label="Component name"
                                    aria-autocomplete="list"
                                    aria-expanded={
                                      nameSuggestions?.mi === mi && nameSuggestions?.ci === ci
                                    }
                                  />
                                ) : (
                                  <span className="day-meal-field day-meal-field--read day-component-field--name">
                                    {comp.name}
                                  </span>
                                )}
                                {comp.ingredientId != null && (
                                  <span
                                    className="day-component-linked"
                                    title="Saved component"
                                    aria-label="Saved component"
                                  >
                                    🥣
                                  </span>
                                )}
                                {editingMeals &&
                                  nameSuggestions?.mi === mi &&
                                  nameSuggestions?.ci === ci && (
                                    <ul className="day-component-suggestions" role="listbox">
                                      {nameSuggestions.items.map((item, idx) => (
                                        <li
                                          key={item.name}
                                          role="option"
                                          aria-selected={idx === nameSuggestions.active}
                                          className={`day-component-suggestion${idx === nameSuggestions.active ? ' day-component-suggestion--active' : ''}`}
                                          onMouseDown={() => selectSuggestion(item)}
                                        >
                                          {item.name}
                                        </li>
                                      ))}
                                      {!nameSuggestions.hasExactMatch && (
                                        <li
                                          role="option"
                                          aria-selected={
                                            nameSuggestions.active === nameSuggestions.items.length
                                          }
                                          className={`day-component-suggestion day-component-suggestion--save${nameSuggestions.active === nameSuggestions.items.length ? ' day-component-suggestion--active' : ''}`}
                                          onMouseDown={() =>
                                            saveAndSelectNew(comp.name.trim(), mi, ci)
                                          }
                                        >
                                          Save "{comp.name.trim()}"
                                        </li>
                                      )}
                                    </ul>
                                  )}
                              </div>
                              {comp.ingredientId != null &&
                                (editingMeals ? (
                                  <input
                                    type="number"
                                    className="day-meal-field day-component-field--qty"
                                    placeholder={comp.units ?? 'Qty'}
                                    min="0"
                                    step="any"
                                    value={comp.quantity != null ? String(comp.quantity) : ''}
                                    onChange={(e) => handleQuantityChange(mi, ci, e.target.value)}
                                    aria-label="Quantity"
                                  />
                                ) : (
                                  <span className="day-meal-field day-meal-field--read day-component-field--qty">
                                    {comp.quantity != null ? String(comp.quantity) : ''}
                                  </span>
                                ))}
                              {editingMeals ? (
                                <input
                                  type="number"
                                  className="day-meal-field day-component-field--cal"
                                  placeholder="kcal"
                                  min="1"
                                  step="1"
                                  value={comp.calories != null ? String(comp.calories) : ''}
                                  readOnly={comp.ingredientId != null}
                                  onChange={(e) =>
                                    updateComponent(mi, ci, {
                                      calories: parseCal(e.target.value),
                                    })
                                  }
                                  aria-label="Calories"
                                />
                              ) : (
                                <span className="day-meal-field day-meal-field--read day-component-field--cal">
                                  {comp.calories != null ? String(comp.calories) : ''}
                                </span>
                              )}
                              {!isGhostComp && editingMeals && (
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
      {savingComponent !== null && (
        <SaveMealComponentDialog
          initialName={savingComponent.name}
          onSave={handleSaveMealComponent}
          onCancel={() => setSavingComponent(null)}
        />
      )}
    </>
  );
}
