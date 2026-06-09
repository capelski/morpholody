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

  ingredient.name = ingredient.name.trim();
  ingredient.nameLower = ingredient.name.toLowerCase();
  if (ingredient.unitsLabel) {
    ingredient.unitsLabel = ingredient.unitsLabel.trim();
  }

  await upsertIngredient(ingredient);
};
