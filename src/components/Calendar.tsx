import { useState, useEffect } from "react";
import Day from "./Day";
import { getDaysWithWeightInMonth } from "../storage";
import "./Calendar.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [daysWithData, setDaysWithData] = useState<Set<number>>(new Set());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  useEffect(() => {
    getDaysWithWeightInMonth(viewYear, viewMonth + 1).then(setDaysWithData);
  }, [viewYear, viewMonth]);

  function handleDayClick(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    // Clicking the selected day again closes the panel.
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

  function prevMonth() {
    setSelectedDate(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    setSelectedDate(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(today);
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

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="calendar">
        <div className="calendar-header">
          <button
            className="nav-btn"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            &#8249;
          </button>
          <div className="month-year">
            <span className="month-name">{MONTHS[viewMonth]}</span>
            <span className="year">{viewYear}</span>
          </div>
          <button
            className="nav-btn"
            onClick={nextMonth}
            aria-label="Next month"
          >
            &#8250;
          </button>
        </div>

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
                day !== null && daysWithData.has(day) ? "has-data" : "",
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

        <div className="calendar-footer">
          <button className="today-btn" onClick={goToToday}>
            Today
          </button>
        </div>
      </div>

      {selectedDate && (
        <Day date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </>
  );
}
