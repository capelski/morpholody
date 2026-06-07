import { useEffect, useState } from 'react';
import { getAllMealComponents, saveMealComponent } from '../storage';
import SaveMealComponentDialog from './SaveMealComponentDialog';
import './Components.css';
import { type Ingredient } from '../types/Ingredient';

const PAGE_SIZE = 20;

export default function Components() {
  const [all, setAll] = useState<Ingredient[]>([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [creating, setCreating] = useState(false);

  function reload() {
    getAllMealComponents().then(setAll);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSave(
    name: string,
    caloriesPerUnit: number,
    units: string,
    id?: string,
    propagate?: boolean,
  ) {
    await saveMealComponent(name, caloriesPerUnit, units, id, propagate ?? true);
    setEditing(null);
    setCreating(false);
    reload();
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
        <button className="components-new-btn" onClick={() => setCreating(true)}>
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
                  <td>{c.units ?? '—'}</td>
                  <td className="components-cell-action">
                    <button
                      className="components-edit-btn"
                      onClick={() => setEditing(c)}
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
        <SaveMealComponentDialog
          initialName=""
          onSave={handleSave}
          onCancel={() => setCreating(false)}
        />
      )}
      {editing && (
        <SaveMealComponentDialog
          title="Edit meal component"
          initialName={editing.name}
          initialCaloriesPerUnit={editing.caloriesPerUnit}
          initialUnits={editing.units}
          id={editing.id}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
