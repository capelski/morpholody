import './NavBar.css';
import { type View } from '../types/View';

interface NavBarProps {
  active: View;
  onChange: (view: View) => void;
  onSignOut?: () => void;
}

export default function NavBar({ active, onChange, onSignOut }: NavBarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-tabs">
        <button
          className={`navbar-item ${active === 'diary' ? 'active' : ''}`}
          onClick={() => onChange('diary')}
        >
          <span className="navbar-icon">&#128197;</span>
          Diary
        </button>
        <button
          className={`navbar-item ${active === 'evolution' ? 'active' : ''}`}
          onClick={() => onChange('evolution')}
        >
          <span className="navbar-icon">&#128200;</span>
          Evolution
        </button>
        <button
          className={`navbar-item ${active === 'components' ? 'active' : ''}`}
          onClick={() => onChange('components')}
        >
          <span className="navbar-icon">&#129379;</span>
          Components
        </button>
      </div>
      {onSignOut && (
        <button className="navbar-signout" onClick={onSignOut} aria-label="Sign out">
          Sign out
        </button>
      )}
    </nav>
  );
}
