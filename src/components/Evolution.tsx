import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { getDiaryEntriesForMonth } from "../storage";
import "./Evolution.css";

const WEIGHT_COLOR = "#3182ce";
const CAL_COLOR = "#dd6b20";

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
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  if (payload.every((p) => p.value == null)) return null;

  const point = payload[0].payload;
  const [y, m, d] = point.dateKey.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const label = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const weightEntry = payload.find((p) => p.dataKey === "weight");
  const calEntry = payload.find((p) => p.dataKey === "calories");

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      {weightEntry?.value != null && (
        <p className="chart-tooltip-weight">{weightEntry.value} kg</p>
      )}
      {calEntry?.value != null && (
        <p className="chart-tooltip-calories">{calEntry.value} kcal</p>
      )}
    </div>
  );
}

export default function Evolution() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    getDiaryEntriesForMonth(year, month).then((entries) => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const weightMap = new Map(entries.map((e) => [e.date, e.weight]));
      const calMap = new Map(entries.map((e) => [e.date, e.calories]));
      setData(
        Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dk = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          return {
            dateKey: dk,
            label: String(day),
            weight: weightMap.get(dk) ?? null,
            calories: calMap.get(dk) ?? null,
          };
        }),
      );
    });
  }, [year, month]);

  const weights = data
    .map((d) => d.weight)
    .filter((w): w is number => w !== null);
  const hasWeight = weights.length > 0;
  const minWeight = hasWeight ? Math.floor(Math.min(...weights) - 1) : 0;
  const maxWeight = hasWeight ? Math.ceil(Math.max(...weights) + 1) : 100;

  const caloriesValues = data
    .map((d) => d.calories)
    .filter((c): c is number => c !== null);
  const hasCalories = caloriesValues.length > 0;
  const minCal = hasCalories
    ? Math.max(0, Math.floor(Math.min(...caloriesValues) - 100))
    : 0;
  const maxCal = hasCalories
    ? Math.ceil(Math.max(...caloriesValues) + 100)
    : 3000;

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  return (
    <div className="evolution">
      <div className="evolution-header">
        <h2 className="evolution-title">Weight evolution</h2>
        <span className="evolution-count">
          {weights.length} {weights.length === 1 ? "entry" : "entries"}
        </span>
      </div>
      <div className="evolution-month-nav">
        <button
          className="evolution-month-btn"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="evolution-month-label">{monthLabel}</span>
        <button
          className="evolution-month-btn"
          onClick={nextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="evolution-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            margin={{ top: 8, right: hasCalories ? 0 : 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#a0aec0" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="weight"
              orientation="left"
              domain={[minWeight, maxWeight]}
              tick={{ fontSize: 11, fill: "#a0aec0" }}
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
            <Tooltip content={<CustomTooltip />} />
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
        {!hasWeight && (
          <p className="evolution-no-data">No entries for this month</p>
        )}
      </div>
    </div>
  );
}
