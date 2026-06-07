import { DiaryEntry } from '../types/DiaryEntry';

export const getDayIndicatorClass = (diaryEntry?: DiaryEntry): string => {
  const hasWeight = diaryEntry?.weight != null;
  const hasMeals = !!diaryEntry && diaryEntry.meals.length > 0;

  if (hasWeight && hasMeals) {
    return 'has-both';
  }

  if (hasMeals) {
    return 'has-meals-only';
  }

  if (hasWeight) {
    return 'has-weight-only';
  }

  return '';
};
