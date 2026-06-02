import { useEffect, useState } from "react";
import { getAllMealComponents, type StoredMealComponent } from "../storage";
import "./Components.css";

const PAGE_SIZE = 20;

export default function Components() {
  const [all, setAll] = useState<StoredMealComponent[]>([]);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    getAllMealComponents().then(setAll);
  }, []);

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
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td className="components-cell-num">{c.caloriesPerUnit}</td>
                  <td>{c.units ?? "—"}</td>
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
    </div>
  );
}
