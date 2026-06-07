export interface MealComponent {
  id: string;
  name: string;
  quantity: number | null;
  calories: number | null;
  ingredientId?: string | null;
}
