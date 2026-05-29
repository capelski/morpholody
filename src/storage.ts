const PREFIX = 'morpholody:weight:'

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${PREFIX}${y}-${m}-${d}`
}

export function getWeight(date: Date): number | null {
  const raw = localStorage.getItem(dateKey(date))
  if (raw === null) return null
  const value = parseFloat(raw)
  return isNaN(value) ? null : value
}

export function setWeight(date: Date, weight: number): void {
  localStorage.setItem(dateKey(date), String(weight))
}

export function getDaysWithWeightInMonth(year: number, month: number): Set<number> {
  const prefix = `${PREFIX}${year}-${String(month + 1).padStart(2, '0')}-`
  const days = new Set<number>()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) {
      const day = parseInt(key.slice(prefix.length), 10)
      if (!isNaN(day)) days.add(day)
    }
  }
  return days
}
