import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  orderBy,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { db } from '../firebase';
import { type DiaryEntry } from '../types/DiaryEntry';
import { type Ingredient } from '../types/Ingredient';

function ingredientsCollection(uid: string) {
  return collection(db as Firestore, 'users', uid, 'ingredients');
}

function diaryCollection(uid: string) {
  return collection(db as Firestore, 'users', uid, 'diary');
}

/** Fetch meal component suggestions matching the given prefix (case-insensitive, up to 10). */
export async function getMealComponentSuggestions(
  uid: string,
  queryStr: string,
): Promise<Ingredient[]> {
  const lower = queryStr.toLowerCase();
  // Prefix range query on nameLower
  const q = query(
    ingredientsCollection(uid),
    where('nameLower', '>=', lower),
    where('nameLower', '<=', lower + ''),
    orderBy('nameLower'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Ingredient).slice(0, 10);
}

/** Return a meal component by its ID, or undefined if not found. */
export async function getMealComponentById(
  uid: string,
  id: string,
): Promise<Ingredient | undefined> {
  const snap = await getDoc(doc(ingredientsCollection(uid), id));
  return snap.exists() ? (snap.data() as Ingredient) : undefined;
}

export async function getMealComponentByName(
  uid: string,
  name: string,
): Promise<Ingredient | undefined> {
  const q = query(ingredientsCollection(uid), where('name', '==', name));
  const snap = await getDocs(q);
  return snap.empty ? undefined : (snap.docs[0].data() as Ingredient);
}

/** Return all meal components sorted by name (case-insensitive). */
export async function getAllMealComponents(uid: string): Promise<Ingredient[]> {
  const q = query(ingredientsCollection(uid), orderBy('nameLower'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Ingredient);
}

/** Upsert a meal component and propagate name/calorie changes to diary entries. */
export async function upsertIngredient(uid: string, ingredient: Ingredient): Promise<void> {
  await setDoc(doc(ingredientsCollection(uid), ingredient.id), ingredient);
  await propagateMealComponentUpdate(uid, ingredient);
}

/** Update all diary entries that contain components linked to the given ingredient. */
async function propagateMealComponentUpdate(uid: string, ingredient: Ingredient): Promise<void> {
  const snap = await getDocs(diaryCollection(uid));
  const affected = snap.docs
    .map((d) => d.data() as DiaryEntry)
    .filter((entry) =>
      entry.meals.some((meal) =>
        meal.components?.some((comp) => comp.ingredientId === ingredient.id),
      ),
    );

  if (affected.length === 0) return;

  const batch = writeBatch(db);
  for (const entry of affected) {
    let changed = false;
    for (const meal of entry.meals) {
      for (const comp of meal.components ?? []) {
        if (comp.ingredientId === ingredient.id) {
          comp.name = ingredient.name;
          if (comp.units != null) {
            comp.calories = Math.round((ingredient.caloriesPerUnit ?? 0) * comp.units);
          }
          changed = true;
        }
      }
      if (changed) {
        meal.calories = meal.components.reduce<number | null>((s, c) => {
          if (c.calories == null) return s;
          return (s ?? 0) + c.calories;
        }, null);
      }
    }
    if (changed) {
      const totalCalories = entry.meals.reduce<number | null>((s, m) => {
        if (m.calories == null) return s;
        return (s ?? 0) + m.calories;
      }, null);
      batch.set(doc(diaryCollection(uid), entry.date), { ...entry, calories: totalCalories });
    }
  }
  await batch.commit();
}
