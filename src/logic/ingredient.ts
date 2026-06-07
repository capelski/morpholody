import { Ingredient } from "../storage";

export const parseIngredient = (
  ingredient: unknown,
): Ingredient | undefined => {
  if (typeof ingredient !== "object" || !ingredient) {
    return undefined;
  }
};
