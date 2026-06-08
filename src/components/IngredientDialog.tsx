import { useEffect, useRef, useState } from 'react';
import { Ingredient } from '../types/Ingredient';
import './IngredientDialog.css';

interface IngredientDialogProps {
  ingredient?: Ingredient;
  title?: string;
  onSave: (
    name: string,
    caloriesPerUnit: number,
    units: string,
    id?: string,
    propagate?: boolean,
  ) => void;
  onCancel: () => void;
}

export default function IngredientDialog({
  ingredient,
  title = 'New meal component',
  onSave,
  onCancel,
}: IngredientDialogProps) {
  const [name, setName] = useState(ingredient?.name ?? '');
  const [calStr, setCalStr] = useState(
    ingredient?.caloriesPerUnit != null ? String(ingredient.caloriesPerUnit) : '',
  );
  const [units, setUnits] = useState(ingredient?.units ?? '');
  const [propagate, setPropagate] = useState(true);
  const calRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    calRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cal = parseFloat(calStr);
    if (!name.trim() || isNaN(cal) || cal <= 0) return;
    onSave(name.trim(), cal, units, ingredient?.id, propagate);
  }

  const valid = name.trim() !== '' && parseFloat(calStr) > 0;

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
                ref={calRef}
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
          {ingredient?.id && (
            <div className="mcd-field mcd-field-checkbox">
              <input
                id="mcd-propagate"
                type="checkbox"
                checked={propagate}
                onChange={(e) => setPropagate(e.target.checked)}
              />
              <label htmlFor="mcd-propagate">
                Propagate changes to meals that use this component
              </label>
            </div>
          )}
          <div className="mcd-actions">
            <button type="button" className="mcd-btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="mcd-btn-save" disabled={!valid}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
