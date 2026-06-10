import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MonthSelector from './MonthSelector';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { getDiaryEntriesForMonth } from '../storage';
import './Evolution.css';

const WEIGHT_COLOR = '#3182ce';
const CAL_COLOR = '#dd6b20';

interface ChartPoint {
  dateKey: string;
  label: string;
  weight: number | null;
  calories: number | null;
}

interface TooltipPayload {
  dataKey: string;
  value: number | null;
  payload: ChartPoint;
}

function CustomTooltip({
  active,
  payload,
  shiftCalories,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  shiftCalories?: boolean;
}) {
  if (!active || !payload?.length) return null;
  if (payload.every((p) => p.value == null)) return null;

  const point = payload[0].payload;
  const [y, m, d] = point.dateKey.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const label = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const prevDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d) - 1);
  const prevLabel = prevDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const weightEntry = payload.find((p) => p.dataKey === 'weight');
  const calEntry = payload.find((p) => p.dataKey === 'calories');

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      {weightEntry?.value != null && <p className="chart-tooltip-weight">{weightEntry.value} kg</p>}
      {calEntry?.value != null && (
        <p className="chart-tooltip-calories">
          {calEntry.value} kcal
          {shiftCalories && <span className="chart-tooltip-cal-note"> ({prevLabel})</span>}
        </p>
      )}
    </div>
  );
}

interface EvolutionProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  onMonthChange: (year: number, month: number) => void;
}

export default function Evolution({ viewYear, viewMonth, onMonthChange }: EvolutionProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const month = viewMonth + 1; // storage uses 1-indexed months

  const [data, setData] = useState<ChartPoint[]>([]);
  const [shiftCalories, setShiftCalories] = useState(false);

  useEffect(() => {
    if (!uid) {
      setData([]);
      return;
    }
    getDiaryEntriesForMonth(uid, viewYear, month).then((entries) => {
      const daysInMonth = new Date(viewYear, month, 0).getDate();
      const weightMap = new Map(entries.map((e) => [e.date, e.weight]));
      const calMap = new Map(entries.map((e) => [e.date, e.calories]));
      setData(
        Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dk = `${viewYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return {
            dateKey: dk,
            label: String(day),
            weight: weightMap.get(dk) ?? null,
            calories: calMap.get(dk) ?? null,
          };
        }),
      );
    });
  }, [uid, viewYear, month]);

  const chartData = shiftCalories
    ? data.map((point, i) => ({
        ...point,
        calories: i > 0 ? data[i - 1].calories : null,
      }))
    : data;

  const weights = chartData.map((d) => d.weight).filter((w): w is number => w !== null);
  const hasWeight = weights.length > 0;
  const minWeight = hasWeight ? Math.floor(Math.min(...weights) - 1) : 0;
  const maxWeight = hasWeight ? Math.ceil(Math.max(...weights) + 1) : 100;

  const caloriesValues = chartData.map((d) => d.calories).filter((c): c is number => c !== null);
  const hasCalories = caloriesValues.length > 0;
  const minCal = hasCalories ? Math.max(0, Math.floor(Math.min(...caloriesValues) - 100)) : 0;
  const maxCal = hasCalories ? Math.ceil(Math.max(...caloriesValues) + 100) : 3000;

  return (
    <div className="evolution">
      <MonthSelector viewYear={viewYear} viewMonth={viewMonth} onMonthChange={onMonthChange} />
      <div className="evolution-header">
        <h2 className="evolution-title">Weight evolution</h2>
        <span className="evolution-count">
          {weights.length} {weights.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <label className="evolution-shift-toggle">
        <input
          type="checkbox"
          checked={shiftCalories}
          onChange={(e) => setShiftCalories(e.target.checked)}
        />
        Calories from previous day
      </label>
      <div className="evolution-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: hasCalories ? 0 : 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#a0aec0' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="weight"
              orientation="left"
              domain={[minWeight, maxWeight]}
              tick={{ fontSize: 11, fill: '#a0aec0' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              width={32}
            />
            {hasCalories && (
              <YAxis
                yAxisId="calories"
                orientation="right"
                domain={[minCal, maxCal]}
                tick={{ fontSize: 11, fill: CAL_COLOR }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
                width={44}
              />
            )}
            <Tooltip
              content={(props: any) => <CustomTooltip {...props} shiftCalories={shiftCalories} />}
            />
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="weight"
              stroke={WEIGHT_COLOR}
              strokeWidth={2.5}
              connectNulls={false}
              dot={(props: any) => {
                if (props.payload?.weight == null) {
                  return <g key={props.key} />;
                }
                return (
                  <Dot
                    key={props.key}
                    {...props}
                    r={3}
                    fill={WEIGHT_COLOR}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={(props: any) => {
                if (props.payload?.weight == null) {
                  return <g key={props.key} />;
                }
                return (
                  <Dot
                    key={props.key}
                    {...props}
                    r={6}
                    fill="#2b6cb0"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }}
            />
            {hasCalories && (
              <Line
                yAxisId="calories"
                type="monotone"
                dataKey="calories"
                stroke={CAL_COLOR}
                strokeWidth={2}
                connectNulls={false}
                dot={(props: any) => {
                  if (props.payload?.calories == null) {
                    return <g key={props.key} />;
                  }
                  return (
                    <Dot
                      key={props.key}
                      {...props}
                      r={3}
                      fill={CAL_COLOR}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={(props: any) => {
                  if (props.payload?.calories == null) {
                    return <g key={props.key} />;
                  }
                  return (
                    <Dot
                      key={props.key}
                      {...props}
                      r={6}
                      fill="#c05621"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        {!hasWeight && <p className="evolution-no-data">No entries for this month</p>}
      </div>
    </div>
  );
}
