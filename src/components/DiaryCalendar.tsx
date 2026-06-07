import { useEffect, useState } from 'react';
import { MONTHS } from '../constants/months';
import { getDayIndicatorClass } from '../logic/diaryEntry';
import { DiaryEntryMap, getMonthEntries } from '../storage';
import Day from './Day';
import './DiaryCalendar.css';
import MonthSelector from './MonthSelector';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

interface DiaryCalendarProps {
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
}

export default function DiaryCalendar({ viewYear, viewMonth, onMonthChange }: DiaryCalendarProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthEntries, setMonthEntries] = useState<DiaryEntryMap>(new Map());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  useEffect(() => {
    getMonthEntries(viewYear, viewMonth + 1).then(setMonthEntries);
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
      day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
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
      <div className="diary-calendar">
        <MonthSelector viewYear={viewYear} viewMonth={viewMonth} onMonthChange={onMonthChange} />

        <div className="diary-calendar-weekdays">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="weekday">
              {d}
            </div>
          ))}
        </div>

        <div className="diary-calendar-grid">
          {cells.map((day, idx) => (
            <button
              key={idx}
              className={[
                'day-cell',
                day === null ? 'empty' : '',
                day !== null && isToday(day) ? 'today' : '',
                day !== null && isSelected(day) ? 'selected' : '',
                day !== null ? getDayIndicatorClass(monthEntries.get(day)) : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={day !== null ? () => handleDayClick(day) : undefined}
              disabled={day === null}
              aria-label={day !== null ? `${MONTHS[viewMonth]} ${day}, ${viewYear}` : undefined}
              aria-pressed={day !== null ? isSelected(day) : undefined}
            >
              {day ?? ''}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <Day
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={() => {
            getMonthEntries(viewYear, viewMonth + 1).then(setMonthEntries);
          }}
          onDateChange={(d) => setSelectedDate(d)}
        />
      )}
    </>
  );
}
