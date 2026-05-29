import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import './Calendar.css'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface DropdownState {
  date: Date
  x: number
  y: number
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export default function Calendar() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dropdown, setDropdown] = useState<DropdownState | null>(null)
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(null)
      }
    }
    if (dropdown) {
      document.addEventListener('pointerdown', handlePointerDown)
      return () => document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [dropdown])

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdown(null)
    }
    if (dropdown) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdown])

  function handleDayClick(day: number, e: React.MouseEvent<HTMLButtonElement>) {
    const date = new Date(viewYear, viewMonth, day)
    setSelectedDate(date)
    const rect = e.currentTarget.getBoundingClientRect()
    setDropdown({ date, x: rect.left, y: rect.bottom + 6 })
  }

  function handleViewDay(date: Date) {
    alert(`Viewing ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
    setDropdown(null)
  }

  function handleAddData(date: Date) {
    setDropdown(null)
    setModalDate(date)
  }

  function prevMonth() {
    setDropdown(null)
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  function nextMonth() {
    setDropdown(null)
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelectedDate(today)
    setDropdown(null)
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    )
  }

  function isSelected(day: number) {
    return (
      selectedDate !== null &&
      day === selectedDate.getDate() &&
      viewMonth === selectedDate.getMonth() &&
      viewYear === selectedDate.getFullYear()
    )
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <>
      <div className="calendar">
        <div className="calendar-header">
          <button className="nav-btn" onClick={prevMonth} aria-label="Previous month">&#8249;</button>
          <div className="month-year">
            <span className="month-name">{MONTHS[viewMonth]}</span>
            <span className="year">{viewYear}</span>
          </div>
          <button className="nav-btn" onClick={nextMonth} aria-label="Next month">&#8250;</button>
        </div>

        <div className="calendar-weekdays">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="weekday">{d}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((day, idx) => (
            <button
              key={idx}
              className={[
                'day-cell',
                day === null ? 'empty' : '',
                day !== null && isToday(day) ? 'today' : '',
                day !== null && isSelected(day) ? 'selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={day !== null ? e => handleDayClick(day, e) : undefined}
              disabled={day === null}
              aria-label={day !== null ? `${MONTHS[viewMonth]} ${day}, ${viewYear}` : undefined}
              aria-haspopup={day !== null ? 'menu' : undefined}
              aria-expanded={day !== null && isSelected(day) && dropdown !== null}
            >
              {day ?? ''}
            </button>
          ))}
        </div>

        <div className="calendar-footer">
          <button className="today-btn" onClick={goToToday}>Today</button>
          {selectedDate && (
            <span className="selected-label">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {modalDate && (
        <Modal
          date={modalDate}
          onClose={() => setModalDate(null)}
          onSave={weight => console.log(`Saved weight ${weight} kg for ${modalDate.toDateString()}`)}
        />
      )}

      {dropdown && (
        <div
          ref={dropdownRef}
          className="day-dropdown"
          style={{ top: dropdown.y, left: dropdown.x }}
          role="menu"
        >
          <button
            className="day-dropdown-item"
            role="menuitem"
            onClick={() => handleViewDay(dropdown.date)}
          >
            <span className="day-dropdown-icon">&#128065;</span>
            View day
          </button>
          <button
            className="day-dropdown-item"
            role="menuitem"
            onClick={() => handleAddData(dropdown.date)}
          >
            <span className="day-dropdown-icon">&#43;</span>
            Add data
          </button>
        </div>
      )}
    </>
  )
}
