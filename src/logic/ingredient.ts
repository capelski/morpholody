import { getMealComponentByName, Ingredient, upsertIngredient } from '../storage';

export const createIngredient = (name: string): Ingredient => ({
  id: crypto.randomUUID(),
  name,
  nameLower: name.toLowerCase(),
  caloriesPerUnit: 0,
});

export const updateIngredient = async (ingredient: Ingredient): Promise<void> => {
  const existing = await getMealComponentByName(ingredient.name);

  if (existing && existing.id !== ingredient.id) {
    throw new Error('An ingredient with this name already exists');
  }

  await upsertIngredient(ingredient);
};
