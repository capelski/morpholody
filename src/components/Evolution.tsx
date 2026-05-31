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

interface ChartPoint {
  dateKey: string;
  label: string;
  weight: number | null;
}

interface TooltipPayload {
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
  if (!active || !payload?.length || payload[0].value === null) return null;
  const { value, payload: point } = payload[0];
  const [y, m, d] = point.dateKey.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const label = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      <p className="chart-tooltip-value">{value} kg</p>
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
      const entryMap = new Map(entries.map((e) => [e.date, e.weight]));
      setData(
        Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dk = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          return {
            dateKey: dk,
            label: String(day),
            weight: entryMap.get(dk) ?? null,
          };
        }),
      );
    });
  }, [year, month]);

  const weights = data
    .map((d) => d.weight)
    .filter((w): w is number => w !== null);
  const hasData = weights.length > 0;
  const minY = hasData ? Math.floor(Math.min(...weights) - 1) : 0;
  const maxY = hasData ? Math.ceil(Math.max(...weights) + 1) : 100;

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
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
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
              domain={[minY, maxY]}
              tick={{ fontSize: 11, fill: "#a0aec0" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3182ce"
              strokeWidth={2.5}
              connectNulls={false}
              dot={(props: any) => {
                if (
                  props.payload?.weight === null ||
                  props.payload?.weight === undefined
                ) {
                  return <g key={props.key} />;
                }
                return (
                  <Dot
                    key={props.key}
                    {...props}
                    r={4}
                    fill="#3182ce"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={(props: any) => {
                if (
                  props.payload?.weight === null ||
                  props.payload?.weight === undefined
                ) {
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
          </LineChart>
        </ResponsiveContainer>
        {!hasData && (
          <p className="evolution-no-data">No entries for this month</p>
        )}
      </div>
    </div>
  );
}
