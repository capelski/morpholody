import { useState } from "react";
import NavBar, { type View } from "./components/NavBar";
import Diary from "./components/Diary";
import Evolution from "./components/Evolution";
import Components from "./components/Components";
import "./App.css";

export default function App() {
  const [view, setView] = useState<View>("diary");
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
      <div className="app-content">
        {view === "diary" ? (
          <Diary viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
        ) : view === "evolution" ? (
          <Evolution viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
        ) : (
          <Components />
        )}
      </div>
    </div>
  );
}
