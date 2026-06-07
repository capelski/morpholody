import { type MealComponent } from './MealComponent';

export interface Meal {
  id: string;
  time: string;
  calories: number | null;
  components: MealComponent[];
}
