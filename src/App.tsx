import { useState } from "react";
import NavBar, { type View } from "./components/NavBar";
import Calendar from "./components/Calendar";
import Evolution from "./components/Evolution";
import Components from "./components/Components";
import "./App.css";

export default function App() {
  const [view, setView] = useState<View>("calendar");
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function handleMonthChange(year: number, month: number) {
    setViewYear(year);
    setViewMonth(month);
  }

  return (
    <div className="app">
      <NavBar active={view} onChange={setView} />
      {view === "calendar" ? (
        <Calendar viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
      ) : view === "evolution" ? (
        <Evolution viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
      ) : (
        <Components />
      )}
    </div>
  );
}
