import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DiaryEntryMap, type DiaryEntry } from '../types/DiaryEntry';
import { type Meal } from '../types/Meal';
import { type MealComponent } from '../types/MealComponent';

function diaryCollection(uid: string) {
  return collection(db as Firestore, 'users', uid, 'diary');
}

/** Fetch the diary entry for a given date key (YYYY-MM-DD). Returns null if none exists yet. */
export async function getDiaryEntry(uid: string, date: string): Promise<DiaryEntry | null> {
  const snap = await getDoc(doc(diaryCollection(uid), date));
  return snap.exists() ? (snap.data() as DiaryEntry) : null;
}

/** Write (or overwrite) the diary entry for a given date key. */
export async function saveDiaryEntry(
  uid: string,
  date: string,
  data: {
    id?: string;
    weight: DiaryEntry['weight'];
    meals: Array<
      Omit<Meal, 'id' | 'calories'> & {
        id?: string;
        components: Array<MealComponent & { id?: string }>;
      }
    >;
  },
): Promise<void> {
  const existing = await getDiaryEntry(uid, date);
  const entryId = data.id ?? existing?.id ?? crypto.randomUUID();
  const mealsWithCalories = data.meals.map((m, mi) => {
    const mealId = m.id ?? existing?.meals[mi]?.id ?? crypto.randomUUID();
    const components = m.components.map((c, ci) => ({
      ...c,
      id: c.id ?? existing?.meals[mi]?.components[ci]?.id ?? crypto.randomUUID(),
    }));
    const mealCal = components.reduce<number | null>((s, c) => {
      if (c.calories == null) return s;
      return (s ?? 0) + c.calories;
    }, null);
    return { ...m, id: mealId, components, calories: mealCal };
  });
  const calories = mealsWithCalories.reduce<number | null>((sum, m) => {
    if (m.calories == null) return sum;
    return (sum ?? 0) + m.calories;
  }, null);

  await setDoc(doc(diaryCollection(uid), date), {
    id: entryId,
    date,
    weight: data.weight,
    meals: mealsWithCalories,
    calories,
  });
}

export async function getDiaryEntriesForMonth(
  uid: string,
  year: number,
  month: number,
): Promise<DiaryEntry[]> {
  const parsedMonth = String(month).padStart(2, '0');
  const start = `${year}-${parsedMonth}-01`;
  const end = `${year}-${parsedMonth}-31`;
  const q = query(diaryCollection(uid), where('date', '>=', start), where('date', '<=', end));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DiaryEntry);
}

export async function getMonthEntries(
  uid: string,
  year: number,
  month: number,
): Promise<DiaryEntryMap> {
  const entries = await getDiaryEntriesForMonth(uid, year, month);
  const map = new Map<number, DiaryEntry>();
  for (const entry of entries) {
    const day = parseInt(entry.date.split('-')[2], 10);
    map.set(day, entry);
  }
  return map;
}
