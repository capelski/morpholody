import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Dot,
} from 'recharts'
import { getAllWeightEntries } from '../storage'
import './Evolution.css'

function formatDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${parseInt(d)}/${parseInt(m)}`
}

interface TooltipPayload {
  value: number
  payload: { dateKey: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const { value, payload: { dateKey } } = payload[0]
  const [y, m, d] = dateKey.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      <p className="chart-tooltip-value">{value} kg</p>
    </div>
  )
}

export default function Evolution() {
  const entries = useMemo(() => getAllWeightEntries(), [])

  if (entries.length === 0) {
    return (
      <div className="evolution-empty">
        <p className="evolution-empty-title">No data yet</p>
        <p className="evolution-empty-hint">Add weight entries from the calendar to see your evolution.</p>
      </div>
    )
  }

  const data = entries.map(e => ({ ...e, label: formatDate(e.dateKey) }))
  const weights = data.map(d => d.weight)
  const minY = Math.floor(Math.min(...weights) - 1)
  const maxY = Math.ceil(Math.max(...weights) + 1)

  return (
    <div className="evolution">
      <div className="evolution-header">
        <h2 className="evolution-title">Weight evolution</h2>
        <span className="evolution-count">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div className="evolution-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#a0aec0' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fontSize: 11, fill: '#a0aec0' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}`}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3182ce"
              strokeWidth={2.5}
              dot={<Dot r={4} fill="#3182ce" stroke="#ffffff" strokeWidth={2} />}
              activeDot={{ r: 6, fill: '#2b6cb0', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
