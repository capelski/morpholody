import './MonthSelector.css';
import { MONTHS } from '../constants/months';

interface MonthSelectorProps {
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
}

export default function MonthSelector({ viewYear, viewMonth, onMonthChange }: MonthSelectorProps) {
  function prevMonth() {
    if (viewMonth === 0) onMonthChange(viewYear - 1, 11);
    else onMonthChange(viewYear, viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) onMonthChange(viewYear + 1, 0);
    else onMonthChange(viewYear, viewMonth + 1);
  }

  return (
    <div className="month-selector">
      <button className="month-selector-btn" onClick={prevMonth} aria-label="Previous month">
        &#8249;
      </button>
      <span className="month-selector-label">
        {MONTHS[viewMonth]} {viewYear}
      </span>
      <button className="month-selector-btn" onClick={nextMonth} aria-label="Next month">
        &#8250;
      </button>
    </div>
  );
}
