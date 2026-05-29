import "./NavBar.css";

export type View = "calendar" | "evolution";

interface NavBarProps {
  active: View;
  onChange: (view: View) => void;
}

export default function NavBar({ active, onChange }: NavBarProps) {
  return (
    <nav className="navbar">
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
    </nav>
  );
}
