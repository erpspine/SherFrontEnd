import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  MapPin,
  Route,
  Ruler,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const createDistanceForm = () => ({
  fromDestination: "",
  toDestination: "",
  distanceKm: "",
});

const extractList = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
};

const normalizeDistance = (item) => ({
  id: Number(item.id || 0),
  fromDestination:
    item.destinationFrom ||
    item.from_destination ||
    item.fromDestination ||
    item.destination_from ||
    "",
  toDestination:
    item.destinationTo ||
    item.to_destination ||
    item.toDestination ||
    item.destination_to ||
    "",
  distanceKm: Number(item.distance_km ?? item.distanceKm ?? item.distance ?? 0),
  createdAt: item.created_at || item.createdAt || "",
});

const toFormFromEntry = (entry) => ({
  fromDestination: entry.fromDestination || "",
  toDestination: entry.toDestination || "",
  distanceKm: String(entry.distanceKm || ""),
});

export default function RouteDistances() {
  const [distances, setDistances] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(createDistanceForm());

  const loadDistances = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiFetch("/destination-distances");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to load destination distances.",
        );
      }

      const list = extractList(payload, [
        "destinationDistances",
        "routeDistances",
      ]).map(normalizeDistance);
      setDistances(list);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load destination distances.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDistances();
  }, []);

  const filteredDistances = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return distances;

    return distances.filter((entry) => {
      return (
        String(entry.fromDestination).toLowerCase().includes(query) ||
        String(entry.toDestination).toLowerCase().includes(query) ||
        String(entry.distanceKm).toLowerCase().includes(query)
      );
    });
  }, [distances, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    setForm(createDistanceForm());
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditingId(entry.id);
    setForm(toFormFromEntry(entry));
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({
      title: "Delete distance record?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const response = await apiFetch(`/destination-distances/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete distance record.",
        );
      }

      setDistances((current) => current.filter((item) => item.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "Distance record deleted successfully.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete distance record.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete distance record.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleSave = async () => {
    const distanceValue = Number(form.distanceKm);

    if (
      !form.fromDestination.trim() ||
      !form.toDestination.trim() ||
      Number.isNaN(distanceValue) ||
      distanceValue <= 0
    ) {
      setErrorMessage(
        "Destination From, Destination To, and Distance KM (greater than 0) are required.",
      );
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please fill destination from, destination to, and valid distance KM.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        destinationFrom: form.fromDestination.trim(),
        destinationTo: form.toDestination.trim(),
        distanceKm: distanceValue,
        distance: distanceValue,
      };

      const response = editingId
        ? await apiFetch(`/destination-distances/${editingId}`, {
            method: "PUT",
            body: payload,
          })
        : await apiFetch("/destination-distances", {
            method: "POST",
            body: payload,
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save distance record.");
      }

      const saved = normalizeDistance(
        data?.data || data?.destinationDistance || data,
      );

      setDistances((current) => {
        if (editingId) {
          return current.map((item) => (item.id === editingId ? saved : item));
        }
        return [saved, ...current];
      });

      setIsModalOpen(false);
      setEditingId(null);
      setForm(createDistanceForm());

      await Swal.fire({
        title: editingId ? "Updated" : "Created",
        text: editingId
          ? "Distance record updated successfully."
          : "Distance record created successfully.",
        icon: "success",
        timer: 1700,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save distance record.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save distance record.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Route Distances</h1>
          <p className="text-slate-400 mt-1">
            Maintain destination pairs and travel distance in KM.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Distance
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Routes</p>
          <p className="text-2xl font-bold text-white mt-1">
            {distances.length}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Visible Routes</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {filteredDistances.length}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Distance (KM)</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">
            {filteredDistances
              .reduce((sum, item) => sum + Number(item.distanceKm || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors mb-4">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by from/to destination or distance"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Destination From
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Destination To
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Distance (KM)
                </th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Loading destination distances...
                  </td>
                </tr>
              ) : filteredDistances.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    No destination distances found.
                  </td>
                </tr>
              ) : (
                filteredDistances.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-400" />
                        {entry.fromDestination}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-cyan-400" />
                        {entry.toDestination}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-slate-400" />
                        {Number(entry.distanceKm || 0).toLocaleString()} km
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isSaving) return;
              setIsModalOpen(false);
            }}
          />

          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit Distance" : "Add Distance"}
              </h2>
              <button
                onClick={() => {
                  if (isSaving) return;
                  setIsModalOpen(false);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Destination From
                </label>
                <input
                  value={form.fromDestination}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fromDestination: event.target.value,
                    }))
                  }
                  placeholder="e.g. Arusha"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Destination To
                </label>
                <input
                  value={form.toDestination}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      toDestination: event.target.value,
                    }))
                  }
                  placeholder="e.g. Serengeti"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Distance (KM)
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.distanceKm}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      distanceKm: event.target.value,
                    }))
                  }
                  placeholder="e.g. 325"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
