import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  ListChecks,
  Trash2,
  CheckCircle2,
  Circle,
  ClipboardList,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const getErrorMessage = (payload, fallback) =>
  payload?.message || payload?.error || fallback;

const CHECKLIST_TYPES = {
  pre_departure: "Pre Departure Checklist",
  post_departure: "Post Departure Checklist",
};

export default function Checklist() {
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistType, setChecklistType] = useState("pre_departure");
  const [checklists, setChecklists] = useState([]);
  const [draftItems, setDraftItems] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadChecklists = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch("/checklists");

      if (!response.ok) {
        let errorMessage = "Failed to load checklists.";
        try {
          const errorData = await response.json();
          errorMessage = getErrorMessage(errorData, errorMessage);
        } catch (parseErr) {
          console.error("Failed to parse error response:", parseErr);
          errorMessage =
            "Failed to load checklists (HTTP " + response.status + ")";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setChecklists(Array.isArray(data?.checklists) ? data.checklists : []);
    } catch (err) {
      console.error("Error loading checklists:", err);
      setError(err.message || "Failed to load checklists.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, []);

  const totalItems = useMemo(
    () =>
      checklists.reduce((sum, list) => {
        const items = Array.isArray(list.items) ? list.items : [];
        return sum + items.length;
      }, 0),
    [checklists],
  );

  const completedItems = useMemo(
    () =>
      checklists.reduce((sum, list) => {
        const items = Array.isArray(list.items) ? list.items : [];
        return sum + items.filter((item) => item.isCompleted).length;
      }, 0),
    [checklists],
  );

  const handleCreateChecklist = async () => {
    const title = checklistTitle.trim();
    if (!title || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      const response = await apiFetch("/checklists", {
        method: "POST",
        body: {
          title,
          checklist_type: checklistType,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Failed to create checklist."));
      }

      if (data?.checklist) {
        setChecklists((prev) => [data.checklist, ...prev]);
      }
      setChecklistTitle("");
    } catch (err) {
      setError(err.message || "Failed to create checklist.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    setError("");

    try {
      const response = await apiFetch(`/checklists/${checklistId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Failed to delete checklist."));
      }

      setChecklists((prev) => prev.filter((list) => list.id !== checklistId));
      setDraftItems((prev) => {
        const next = { ...prev };
        delete next[checklistId];
        return next;
      });
    } catch (err) {
      setError(err.message || "Failed to delete checklist.");
    }
  };

  const handleAddItem = async (checklistId) => {
    const draft = (draftItems[checklistId] || "").trim();
    if (!draft) return;

    setError("");

    try {
      const response = await apiFetch(`/checklists/${checklistId}/items`, {
        method: "POST",
        body: { text: draft },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Failed to add checklist item."));
      }

      if (data?.item) {
        setChecklists((prev) =>
          prev.map((list) => {
            if (list.id !== checklistId) return list;
            return {
              ...list,
              items: [...(list.items || []), data.item],
            };
          }),
        );
      }

      setDraftItems((prev) => ({ ...prev, [checklistId]: "" }));
    } catch (err) {
      setError(err.message || "Failed to add checklist item.");
    }
  };

  const handleToggleItem = async (checklistId, item) => {
    setError("");

    try {
      const response = await apiFetch(
        `/checklists/${checklistId}/items/${item.id}`,
        {
          method: "PUT",
          body: { is_completed: !item.isCompleted },
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to update checklist item."),
        );
      }

      if (data?.item) {
        setChecklists((prev) =>
          prev.map((list) => {
            if (list.id !== checklistId) return list;
            return {
              ...list,
              items: (list.items || []).map((existingItem) =>
                existingItem.id === item.id ? data.item : existingItem,
              ),
            };
          }),
        );
      }
    } catch (err) {
      setError(err.message || "Failed to update checklist item.");
    }
  };

  const handleDeleteItem = async (checklistId, itemId) => {
    setError("");

    try {
      const response = await apiFetch(
        `/checklists/${checklistId}/items/${itemId}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to delete checklist item."),
        );
      }

      setChecklists((prev) =>
        prev.map((list) => {
          if (list.id !== checklistId) return list;
          return {
            ...list,
            items: (list.items || []).filter((entry) => entry.id !== itemId),
          };
        }),
      );
    } catch (err) {
      setError(err.message || "Failed to delete checklist item.");
    }
  };

  const preDepartureChecklists = useMemo(
    () =>
      checklists.filter(
        (list) => (list.checklistType || "pre_departure") === "pre_departure",
      ),
    [checklists],
  );

  const postDepartureChecklists = useMemo(
    () => checklists.filter((list) => list.checklistType === "post_departure"),
    [checklists],
  );

  const renderChecklistCards = (lists, checklistTypeKey) => {
    if (lists.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          No {CHECKLIST_TYPES[checklistTypeKey].toLowerCase()} found yet.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {lists.map((list) => {
          const listItems = Array.isArray(list.items) ? list.items : [];
          const doneCount = listItems.filter((item) => item.isCompleted).length;
          const draftValue = draftItems[list.id] || "";

          return (
            <article
              key={list.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    <ListChecks className="h-3.5 w-3.5" />
                    {CHECKLIST_TYPES[list.checklistType] ||
                      CHECKLIST_TYPES.pre_departure}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    {list.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {doneCount} of {listItems.length} item(s) completed
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteChecklist(list.id)}
                  className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 transition-colors"
                  aria-label={`Delete ${list.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={draftValue}
                    onChange={(event) =>
                      setDraftItems((prev) => ({
                        ...prev,
                        [list.id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddItem(list.id);
                      }
                    }}
                    placeholder="Add checklist item"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddItem(list.id)}
                    className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl border border-sher-gold-dark bg-sher-gold px-3 py-2.5 font-semibold text-slate-900 hover:bg-sher-gold-dark hover:text-white transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>

                <ul className="mt-4 space-y-2">
                  {listItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleItem(list.id, item)}
                        className="text-slate-500 hover:text-emerald-600 transition-colors"
                        aria-label={`Mark ${item.text} as ${item.isCompleted ? "incomplete" : "complete"}`}
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      <span
                        className={`flex-1 text-sm ${
                          item.isCompleted
                            ? "text-slate-400 line-through"
                            : "text-slate-700"
                        }`}
                      >
                        {item.text}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(list.id, item.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        aria-label={`Delete ${item.text}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}

                  {listItems.length === 0 && (
                    <li className="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                      Add your first item to this checklist.
                    </li>
                  )}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm p-6 md:p-8">
        <div className="absolute -top-16 -right-14 h-44 w-44 rounded-full bg-sky-100/70 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-amber-100/65 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Task Planning
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Checklist Manager
            </h1>
            <p className="mt-2 text-slate-600">
              Create checklists and add checklist items dynamically as work
              evolves.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Checklists</p>
              <p className="text-xl font-semibold text-slate-900">
                {checklists.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Completed</p>
              <p className="text-xl font-semibold text-emerald-700">
                {completedItems}/{totalItems}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <label
          htmlFor="checklist-title"
          className="block text-sm font-medium text-slate-700"
        >
          New Checklist
        </label>
        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          <select
            value={checklistType}
            onChange={(event) => setChecklistType(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
          >
            <option value="pre_departure">Pre Departure</option>
            <option value="post_departure">Post Departure</option>
          </select>
          <input
            id="checklist-title"
            type="text"
            value={checklistTitle}
            onChange={(event) => setChecklistTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreateChecklist();
              }
            }}
            placeholder="e.g. Vehicle handover checklist"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
          />
          <button
            type="button"
            onClick={handleCreateChecklist}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sher-gold-dark px-4 py-3 font-semibold text-slate-900 bg-sher-gold hover:bg-sher-gold-dark hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {isSaving ? "Creating..." : "Create Checklist"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
        )}
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          Loading checklists...
        </section>
      ) : checklists.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-800">
            No checklists yet
          </h2>
          <p className="mt-1 text-slate-600">
            Create your first checklist to start tracking tasks and enable the
            Add Item button.
          </p>
        </section>
      ) : (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Pre Departure Checklists
            </h2>
            {renderChecklistCards(preDepartureChecklists, "pre_departure")}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Post Departure Checklists
            </h2>
            {renderChecklistCards(postDepartureChecklists, "post_departure")}
          </div>
        </section>
      )}
    </div>
  );
}
