import { useEffect, useState } from "react";
import { getDiaryEntriesForMonth, type DiaryEntry } from "../storage";
import Day from "./Day";
import MonthSelector from "./MonthSelector";
import "./DiaryList.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DiaryListProps {
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
}

interface Row {
  dateStr: string;
  entry: DiaryEntry | null;
}

function buildRows(year: number, month: number, entries: DiaryEntry[]): Row[] {
  const entryMap = new Map(entries.map((e) => [e.date, e]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows: Row[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    rows.push({ dateStr, entry: entryMap.get(dateStr) ?? null });
  }
  return rows;
}

export default function DiaryList({ viewYear, viewMonth, onMonthChange }: DiaryListProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  function reload() {
    getDiaryEntriesForMonth(viewYear, viewMonth + 1).then(setEntries);
  }

  useEffect(() => {
    reload();
    setSelectedDate(null);
  }, [viewYear, viewMonth]);

  function handleRowClick(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (selectedDate?.toDateString() === date.toDateString()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${WEEKDAYS[date.getDay()]}, ${d}`;
  }

  function totalCalories(entry: DiaryEntry): number | null {
    return entry.meals.reduce<number | null>((acc, meal) => {
      if (meal.calories == null) return acc;
      return (acc ?? 0) + meal.calories;
    }, null);
  }

  const rows = buildRows(viewYear, viewMonth, entries);

  return (
    <>
      <div className="diary-list">
        <MonthSelector viewYear={viewYear} viewMonth={viewMonth} onMonthChange={onMonthChange} />

        <ul className="diary-list-entries">
          {rows.map(({ dateStr, entry }) => {
            const [y, m, d] = dateStr.split("-").map(Number);
            const isSelected = selectedDate?.toDateString() === new Date(y, m - 1, d).toDateString();
            const cal = entry ? totalCalories(entry) : null;
            const meals = entry?.meals.filter((meal) => meal.components?.length > 0) ?? [];
            return (
              <li
                key={dateStr}
                className={`diary-list-row${isSelected ? " selected" : ""}${!entry ? " empty" : ""}`}
                onClick={() => handleRowClick(dateStr)}
              >
                <div className="diary-list-row-header">
                  <span className="diary-list-date">{formatDate(dateStr)}</span>
                  <span className="diary-list-meta">
                    {entry?.weight != null && (
                      <span className="diary-list-weight">{entry.weight} kg</span>
                    )}
                    {cal != null && (
                      <span className="diary-list-cal">{cal} kcal</span>
                    )}
                  </span>
                </div>
                {meals.length > 0 && (
                  <ul className="diary-list-meals">
                    {meals.map((meal, i) => (
                      <li key={i} className="diary-list-meal">
                        <span className="diary-list-meal-time">{meal.time}</span>
                        <ul className="diary-list-components">
                          {meal.components.map((c, j) => (
                            <li key={j} className="diary-list-component">
                              <span className="diary-list-component-name">{c.name}</span>
                              {c.calories != null && (
                                <span className="diary-list-component-cal">{c.calories} kcal</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {selectedDate && (
        <Day
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={() => reload()}
        />
      )}
    </>
  );
}
