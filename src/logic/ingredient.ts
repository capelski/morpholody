import { Ingredient } from '../storage';

export const createIngredient = (name: string): Ingredient => ({
  id: crypto.randomUUID(),
  name,
  nameLower: name.toLowerCase(),
  caloriesPerUnit: 0,
});
