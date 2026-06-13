import { signOut } from 'firebase/auth';
import { useState } from 'react';
import './App.css';
import Chat from './components/Chat';
import Diary from './components/Diary';
import Evolution from './components/Evolution';
import Ingredients from './components/Ingredients';
import LoginPromptModal from './components/LoginPromptModal';
import NavBar from './components/NavBar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPromptProvider } from './context/LoginPromptContext';
import { auth } from './firebase';
import { type View } from './types/View';

function AppShell() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('diary');
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  if (loading) return null;

  function handleMonthChange(year: number, month: number) {
    setViewYear(year);
    setViewMonth(month);
  }

  return (
    <LoginPromptProvider onRequest={() => setShowLoginPrompt(true)}>
      <div className="app">
        <NavBar
          active={view}
          onChange={setView}
          onSignIn={user ? undefined : () => setShowLoginPrompt(true)}
          onSignOut={user ? () => signOut(auth) : undefined}
        />
        <div className="app-content">
          {view === 'diary' ? (
            <Diary viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
          ) : view === 'evolution' ? (
            <Evolution viewYear={viewYear} viewMonth={viewMonth} onMonthChange={handleMonthChange} />
          ) : view === 'chat' ? (
            <Chat />
          ) : (
            <Ingredients />
          )}
        </div>
      </div>
      {showLoginPrompt && <LoginPromptModal onClose={() => setShowLoginPrompt(false)} />}
    </LoginPromptProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
