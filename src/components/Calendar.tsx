import { useState, useEffect } from "react";
import Day from "./Day";
import { getDayDataForMonth } from "../storage";
import "./Calendar.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface CalendarProps {
  viewYear: number;
  viewMonth: number;
}

export default function Calendar({ viewYear, viewMonth }: CalendarProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayData, setDayData] = useState<
    Map<number, { hasWeight: boolean; hasMeals: boolean }>
  >(new Map());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  useEffect(() => {
    getDayDataForMonth(viewYear, viewMonth + 1).then(setDayData);
  }, [viewYear, viewMonth]);

  useEffect(() => {
    setSelectedDate(null);
  }, [viewYear, viewMonth]);

  function handleDayClick(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    if (
      selectedDate &&
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    ) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
  }

  function isSelected(day: number) {
    return (
      selectedDate !== null &&
      day === selectedDate.getDate() &&
      viewMonth === selectedDate.getMonth() &&
      viewYear === selectedDate.getFullYear()
    );
  }

  function dotClass(day: number): string {
    const info = dayData.get(day);
    if (!info) return "";
    const { hasWeight, hasMeals } = info;
    if (hasWeight && hasMeals) return "has-both";
    if (hasMeals) return "has-meals-only";
    // Blue dot suppressed for today (weight-only).
    if (hasWeight && !isToday(day)) return "has-weight-only";
    return "";
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="calendar">
        <div className="calendar-weekdays">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="weekday">
              {d}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((day, idx) => (
            <button
              key={idx}
              className={[
                "day-cell",
                day === null ? "empty" : "",
                day !== null && isToday(day) ? "today" : "",
                day !== null && isSelected(day) ? "selected" : "",
                day !== null ? dotClass(day) : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={day !== null ? () => handleDayClick(day) : undefined}
              disabled={day === null}
              aria-label={
                day !== null
                  ? `${MONTHS[viewMonth]} ${day}, ${viewYear}`
                  : undefined
              }
              aria-pressed={day !== null ? isSelected(day) : undefined}
            >
              {day ?? ""}
            </button>
          ))}
        </div>


      </div>

      {selectedDate && (
        <Day
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={() => {
            getDayDataForMonth(viewYear, viewMonth + 1).then(setDayData);
          }}
        />
      )}
    </>
  );
}
