import { useEffect } from 'react'
import './DayView.css'

interface DayViewProps {
  date: Date
  weight: number | null
  onClose: () => void
}

export default function DayView({ date, weight, onClose }: DayViewProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const label = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div
        className="modal day-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-view-title"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="day-view-title">Day summary</h2>
            <p className="modal-date">{label}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">&#10005;</button>
        </div>

        <div className="day-view-body">
          <div className="day-view-row">
            <span className="day-view-label">Weight</span>
            {weight !== null
              ? <span className="day-view-value">{weight} <span className="day-view-unit">kg</span></span>
              : <span className="day-view-empty">No data recorded</span>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
