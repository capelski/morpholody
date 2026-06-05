import { type MealComponent } from "./MealComponent";

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  calories: number | null;
  weight: number | null;
  meals: Array<{ id: string; time: string; calories: number | null; components: MealComponent[] }>;
}
