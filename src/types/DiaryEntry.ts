import { type Meal } from './Meal';

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  calories: number | null;
  weight: number | null;
  meals: Meal[];
}

export type DiaryEntryMap = Map<number, DiaryEntry>;
