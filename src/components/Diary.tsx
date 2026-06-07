import { useState } from 'react';
import DiaryCalendar from './DiaryCalendar';
import DiaryList from './DiaryList';
import './Diary.css';

type DiaryTab = 'calendar' | 'list';

interface DiaryProps {
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
}

export default function Diary({ viewYear, viewMonth, onMonthChange }: DiaryProps) {
  const [tab, setTab] = useState<DiaryTab>('calendar');

  return (
    <div className="diary">
      <div className="diary-tabs">
        <button
          className={`diary-tab${tab === 'calendar' ? ' active' : ''}`}
          onClick={() => setTab('calendar')}
        >
          Calendar
        </button>
        <button
          className={`diary-tab${tab === 'list' ? ' active' : ''}`}
          onClick={() => setTab('list')}
        >
          List
        </button>
      </div>

      {tab === 'calendar' ? (
        <DiaryCalendar viewYear={viewYear} viewMonth={viewMonth} onMonthChange={onMonthChange} />
      ) : (
        <DiaryList viewYear={viewYear} viewMonth={viewMonth} onMonthChange={onMonthChange} />
      )}
    </div>
  );
}
