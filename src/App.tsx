import { useState } from 'react'
import NavBar, { type View } from './components/NavBar'
import Calendar from './components/Calendar'
import Evolution from './components/Evolution'
import './App.css'

export default function App() {
  const [view, setView] = useState<View>('calendar')

  return (
    <div className="app">
      <NavBar active={view} onChange={setView} />
      {view === 'calendar' ? <Calendar /> : <Evolution />}
    </div>
  )
}
