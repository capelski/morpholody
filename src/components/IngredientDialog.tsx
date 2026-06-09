import { useEffect, useState } from 'react';
import { updateIngredient } from '../logic/ingredient';
import { Ingredient } from '../types/Ingredient';
import './IngredientDialog.css';

interface IngredientDialogProps {
  ingredient: Ingredient;
  title?: string;
  onSaved: (ingredient: Ingredient) => void;
  onCancel: () => void;
}

export default function IngredientDialog({
  ingredient,
  title = 'New meal component',
  onSaved,
  onCancel,
}: IngredientDialogProps) {
  const [name, setName] = useState(ingredient?.name ?? '');
  const [calStr, setCalStr] = useState(
    ingredient?.caloriesPerUnit ? String(ingredient.caloriesPerUnit) : '',
  );
  const [units, setUnits] = useState(ingredient?.units ?? '');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const isValid = name.trim() !== '' && parseFloat(calStr) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isValid) {
      const cal = parseFloat(calStr);
      const trimmedName = name.trim();

      const updatedIngredient: Ingredient = {
        ...ingredient,
        name: trimmedName,
        nameLower: trimmedName.toLowerCase(),
        caloriesPerUnit: cal,
        units: units.trim(),
      };

      try {
        await updateIngredient(updatedIngredient);
        onSaved(updatedIngredient);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'An error occurred while saving the ingredient',
        );
      }
    }
  }

  return (
    <div className="mcd-overlay" onPointerDown={onCancel}>
      <div
        className="mcd-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcd-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mcd-header">
          <h2 className="mcd-title" id="mcd-title">
            {title}
          </h2>
        </div>
        <form className="mcd-body" onSubmit={handleSubmit}>
          <div className="mcd-field">
            <label className="mcd-label" htmlFor="mcd-name">
              Name
            </label>
            <input
              id="mcd-name"
              type="text"
              className="mcd-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mcd-field">
            <label className="mcd-label" htmlFor="mcd-units">
              Units
            </label>
            <input
              id="mcd-units"
              type="text"
              className="mcd-input"
              placeholder="100g, 1 tbsp, 25oz, etc."
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </div>
          <div className="mcd-field">
            <label className="mcd-label" htmlFor="mcd-cal">
              Calories per unit
            </label>
            <div className="mcd-input-row">
              <input
                id="mcd-cal"
                type="number"
                className="mcd-input"
                placeholder="0"
                min="0.001"
                step="any"
                value={calStr}
                onChange={(e) => setCalStr(e.target.value)}
              />
              <span className="mcd-input-unit">kcal</span>
            </div>
          </div>
          {errorMessage && <div className="mcd-error">{errorMessage}</div>}
          <div className="mcd-actions">
            <button type="button" className="mcd-btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="mcd-btn-save" disabled={!isValid}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
