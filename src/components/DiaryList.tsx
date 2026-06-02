import { useEffect, useState } from "react";
import { getDiaryEntriesForMonth, type DiaryEntry } from "../storage";
import Day from "./Day";
import MonthSelector from "./MonthSelector";
import "./DiaryList.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DiaryListProps {
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
}

export default function DiaryList({ viewYear, viewMonth, onMonthChange }: DiaryListProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  function reload() {
    getDiaryEntriesForMonth(viewYear, viewMonth + 1).then((all) => {
      const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
      setEntries(sorted);
    });
  }

  useEffect(() => {
    reload();
    setSelectedDate(null);
  }, [viewYear, viewMonth]);

  function handleRowClick(entry: DiaryEntry) {
    const [y, m, d] = entry.date.split("-").map(Number);
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
    const weekday = WEEKDAYS[date.getDay()];
    const month = MONTHS[m - 1].slice(0, 3);
    return `${weekday}, ${month} ${d}, ${y}`;
  }

  function totalCalories(entry: DiaryEntry): number | null {
    const sum = entry.meals.reduce<number | null>((acc, meal) => {
      if (meal.calories == null) return acc;
      return (acc ?? 0) + meal.calories;
    }, null);
    return sum;
  }

  return (
    <>
      <div className="diary-list">
        <MonthSelector viewYear={viewYear} viewMonth={viewMonth} onMonthChange={onMonthChange} />

        {entries.length === 0 ? (
          <p className="diary-list-empty">No entries for {MONTHS[viewMonth]} {viewYear}.</p>
        ) : (
          <ul className="diary-list-entries">
            {entries.map((entry) => {
              const cal = totalCalories(entry);
              const isSelected = selectedDate?.toDateString() === (() => {
                const [y, m, d] = entry.date.split("-").map(Number);
                return new Date(y, m - 1, d).toDateString();
              })();
              return (
                <li
                  key={entry.date}
                  className={`diary-list-row${isSelected ? " selected" : ""}`}
                  onClick={() => handleRowClick(entry)}
                >
                  <span className="diary-list-date">{formatDate(entry.date)}</span>
                  <span className="diary-list-meta">
                    {entry.weight != null && (
                      <span className="diary-list-weight">{entry.weight} kg</span>
                    )}
                    {cal != null && (
                      <span className="diary-list-cal">{cal} kcal</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
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
