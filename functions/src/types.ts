export interface Ingredient {
  id: string;
  name: string;
  nameLower: string;
  caloriesPerUnit: number;
  unitsLabel?: string;
}

export interface MealComponent {
  id: string;
  calories: number | null;
  name: string;
  ingredientId?: string | null;
  caloriesPerUnit?: number;
  unitsLabel?: string;
  units?: number | null;
}

export interface Meal {
  id: string;
  time: string;
  calories: number | null;
  components: MealComponent[];
}

export interface DiaryEntry {
  id: string;
  date: string;
  calories: number | null;
  weight: number | null;
  meals: Meal[];
}
