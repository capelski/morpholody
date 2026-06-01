import "./NavBar.css";

export type View = "calendar" | "evolution";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface NavBarProps {
  active: View;
  onChange: (view: View) => void;
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
}

export default function NavBar({ active, onChange, viewYear, viewMonth, onMonthChange }: NavBarProps) {
  function prevMonth() {
    if (viewMonth === 0) onMonthChange(viewYear - 1, 11);
    else onMonthChange(viewYear, viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) onMonthChange(viewYear + 1, 0);
    else onMonthChange(viewYear, viewMonth + 1);
  }

  return (
    <nav className="navbar">
      <div className="navbar-month">
        <button className="navbar-month-btn" onClick={prevMonth} aria-label="Previous month">
          &#8249;
        </button>
        <span className="navbar-month-label">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button className="navbar-month-btn" onClick={nextMonth} aria-label="Next month">
          &#8250;
        </button>
      </div>
      <div className="navbar-tabs">
        <button
          className={`navbar-item ${active === "calendar" ? "active" : ""}`}
          onClick={() => onChange("calendar")}
        >
          <span className="navbar-icon">&#128197;</span>
          Calendar
        </button>
        <button
          className={`navbar-item ${active === "evolution" ? "active" : ""}`}
          onClick={() => onChange("evolution")}
        >
          <span className="navbar-icon">&#128200;</span>
          Evolution
        </button>
      </div>
    </nav>
  );
}
