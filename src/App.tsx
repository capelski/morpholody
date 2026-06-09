import { signOut } from 'firebase/auth';
import { useState } from 'react';
import './App.css';
import Diary from './components/Diary';
import Evolution from './components/Evolution';
import Ingredients from './components/Ingredients';
import Login from './components/Login';
import NavBar from './components/NavBar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { auth } from './firebase';
import { type View } from './types/View';

function AppShell() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('diary');
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  if (loading) return null;
  if (!user) return <Login />;

  function handleMonthChange(year: number, month: number) {
    setViewYear(year);
    setViewMonth(month);
  }

  return (
    <div className="app">
      <NavBar active={view} onChange={setView} onSignOut={() => signOut(auth)} />
      <div className="app-content">
        {view === 'diary' ? (
          <Diary viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
        ) : view === 'evolution' ? (
          <Evolution viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
        ) : (
          <Ingredients />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
