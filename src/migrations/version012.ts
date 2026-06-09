export function applyVersion12(
  _db: IDBDatabase,
  tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  reject: (reason?: unknown) => void,
  onDone: () => void,
): void {
  if (e.oldVersion < 11) {
    onDone();
    return;
  }

  const allIngredientsReq = tx.objectStore('ingredients').getAll();
  allIngredientsReq.onsuccess = () => {
    const ingredientMap = new Map<string, Record<string, unknown>>();
    for (const ing of allIngredientsReq.result as Array<Record<string, unknown>>) {
      ingredientMap.set(ing.id as string, ing);
    }

    const cursorReq = tx.objectStore('diary').openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) {
        onDone();
        return;
      }
      const entry = cursor.value as Record<string, unknown>;
      let changed = false;
      for (const meal of (entry.meals ?? []) as Array<Record<string, unknown>>) {
        for (const comp of (meal.components ?? []) as Array<Record<string, unknown>>) {
          if (comp.ingredientId) {
            const ingredient = ingredientMap.get(comp.ingredientId as string);
            if (ingredient?.unitsLabel !== undefined) {
              comp.unitsLabel = ingredient.unitsLabel;
              changed = true;
            }
          }
        }
      }
      if (changed) cursor.update(entry);
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  };
  allIngredientsReq.onerror = () => reject(allIngredientsReq.error);
}
