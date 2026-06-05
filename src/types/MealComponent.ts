export interface MealComponent {
  id: string;
  name: string;
  quantity: number | null;
  calories: number | null;
  mealComponentId?: string | null;
}
