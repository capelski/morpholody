import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLoginPrompt } from '../context/LoginPromptContext';
import { createIngredient } from '../logic/ingredient';
import { getAllMealComponents } from '../storage';
import { type Ingredient } from '../types/Ingredient';
import IngredientDialog from './IngredientDialog';
import './Ingredients.css';

const PAGE_SIZE = 20;

export default function Ingredients() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const requestLogin = useLoginPrompt();
  const [all, setAll] = useState<Ingredient[]>([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!uid) {
      setAll([]);
      return;
    }
    getAllMealComponents(uid).then(setAll);
  }, [uid]);

  async function handleSaved() {
    setEditing(null);
    setCreating(false);
    if (!uid) return;
    getAllMealComponents(uid).then(setAll);
  }

  const filtered = filter.trim()
    ? all.filter((c) => c.nameLower.includes(filter.trim().toLowerCase()))
    : all;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

  function handleFilterChange(value: string) {
    setFilter(value);
    setPage(0);
  }

  return (
    <div className="components-view">
      <div className="components-toolbar">
        <input
          className="components-filter"
          type="search"
          placeholder="Filter by name…"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
        />
        <button
          className="components-new-btn"
          onClick={() => {
            if (!uid) {
              requestLogin();
              return;
            }
            setCreating(true);
          }}
        >
          + New
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="components-empty">No components found.</p>
      ) : (
        <>
          <table className="components-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cal / unit</th>
                <th>Units</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td className="components-cell-num">{c.caloriesPerUnit}</td>
                  <td>{c.unitsLabel ?? '—'}</td>
                  <td className="components-cell-action">
                    <button
                      className="components-edit-btn"
                      onClick={() => {
                        if (!uid) {
                          requestLogin();
                          return;
                        }
                        setEditing(c);
                      }}
                      aria-label={`Edit ${c.name}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="components-pagination">
            <button
              className="components-page-btn"
              disabled={clampedPage === 0}
              onClick={() => setPage(clampedPage - 1)}
            >
              ‹
            </button>
            <span className="components-page-info">
              {clampedPage + 1} / {totalPages}
            </span>
            <button
              className="components-page-btn"
              disabled={clampedPage >= totalPages - 1}
              onClick={() => setPage(clampedPage + 1)}
            >
              ›
            </button>
          </div>
        </>
      )}
      {creating && (
        <IngredientDialog
          ingredient={createIngredient('')}
          onSaved={handleSaved}
          onCancel={() => setCreating(false)}
        />
      )}
      {editing && (
        <IngredientDialog
          ingredient={editing}
          title="Edit meal component"
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
