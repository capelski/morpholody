import { Ingredient } from "./Ingredient";

export type MealComponent = {
  calories: number | null;
  id: string;
} & ({
  ingredientId?: null;
  name: string;
} | Pick<Ingredient, "caloriesPerUnit" | "name" | "units"> & {
  quantity: number | null;
  ingredientId: string;
});
