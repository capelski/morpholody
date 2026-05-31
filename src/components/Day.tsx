import { useEffect, useState } from "react";
import { getWeight, getMealsForDate, type Meal } from "../storage";
import "./Day.css";

interface DayProps {
  date: Date;
  onClose: () => void;
}

export default function Day({ date, onClose }: DayProps) {
  const [weight, setWeight] = useState<number | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    setWeight(null);
    setMeals([]);
    getWeight(date).then(setWeight);
    getMealsForDate(date).then(setMeals);
  }, [date]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
          <div>
            <h2 className="day-panel-title" id="day-panel-title">
              {label}
            </h2>
          </div>
          <button
            className="day-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        <div className="day-body">
          <section className="day-section">
            <h3 className="day-section-label">Weight</h3>
            {weight !== null ? (
              <p className="day-weight">
                {weight} <span className="day-weight-unit">kg</span>
              </p>
            ) : (
              <p className="day-empty">No weight recorded</p>
            )}
          </section>

          <section className="day-section">
            <h3 className="day-section-label">Meals</h3>
            {meals.length > 0 ? (
              <ul className="day-meals">
                {meals.map((meal) => (
                  <li key={meal.time} className="day-meal-row">
                    <span className="day-meal-time">{meal.time}</span>
                    <span className="day-meal-desc">{meal.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="day-empty">No meals recorded</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
