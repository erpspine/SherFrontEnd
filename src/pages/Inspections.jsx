import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Eye,
  Image,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/api$/, "");

const TYPE_LABELS = {
  pre_departure: "Pre Departure",
  post_departure: "Post Departure",
};

const TYPE_COLORS = {
  pre_departure: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  post_departure: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeInspection = (raw) => ({
  id: Number(raw.id || 0),
  type: raw.type || "pre_departure",
  remarks: raw.remarks || "",
  lead: raw.lead
    ? {
        id: Number(raw.lead.id || 0),
        clientCompany: raw.lead.clientCompany || raw.lead.client_company || "-",
        bookingRef: raw.lead.bookingRef || raw.lead.booking_ref || "-",
      }
    : null,
  vehicle: raw.vehicle
    ? {
        id: Number(raw.vehicle.id || 0),
        make: raw.vehicle.make || "",
        model: raw.vehicle.model || "",
        plateNo: raw.vehicle.plateNo || raw.vehicle.plate_no || "",
      }
    : null,
  odometerOut:
    raw.odometerOut ?? raw.odometer_out ?? raw.odometer ?? raw.odometer_reading,
  odometerIn:
    raw.odometerIn ?? raw.odometer_in ?? raw.odometer ?? raw.odometer_reading,
  items: Array.isArray(raw.items)
    ? raw.items.map((item) => ({
        id: Number(item.id || 0),
        checklistId: item.checklistId || item.checklist_id,
        checklistTitle:
          item.checklistTitle || item.checklist_title || "General",
        name: item.name || "",
        text: item.text || "",
        status: item.status || "OK",
        issue: item.issue || "",
        sortOrder: item.sortOrder ?? item.sort_order ?? 0,
      }))
    : [],
  images: Array.isArray(raw.images)
    ? raw.images.map((img) => ({
        id: Number(img.id || 0),
        path: img.path || "",
        sortOrder: img.sortOrder ?? img.sort_order ?? 0,
      }))
    : [],
  createdAt: raw.createdAt || raw.created_at || "",
  updatedAt: raw.updatedAt || raw.updated_at || "",
});

const resolveImageUrl = (path) => {
  if (!path) return null;
  const value = String(path).trim();
  if (!value) return null;

  if (value.startsWith("data:image/") || /^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/storage/")) {
    return `${API_BASE}${value}`;
  }

  if (value.startsWith("storage/")) {
    return `${API_BASE}/${value}`;
  }

  if (value.startsWith("/inspection-images/")) {
    return `${API_BASE}/storage${value}`;
  }

  if (value.startsWith("inspection-images/")) {
    return `${API_BASE}/storage/${value}`;
  }

  return `${API_BASE}/storage/${value.replace(/^\/+/, "")}`;
};

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInspections = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await apiFetch("/inspections");
      const payload = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(payload?.message || "Failed to load inspections.");
      const list = Array.isArray(payload?.inspections)
        ? payload.inspections
        : Array.isArray(payload)
          ? payload
          : [];
      setInspections(list.map(normalizeInspection));
    } catch (err) {
      setErrorMessage(err.message || "Failed to load inspections.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, []);

  const filteredInspections = useMemo(() => {
    let list = inspections;
    if (activeTab !== "all") {
      list = list.filter((i) => i.type === activeTab);
    }
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (i) =>
        (i.lead?.bookingRef || "").toLowerCase().includes(q) ||
        (i.lead?.clientCompany || "").toLowerCase().includes(q) ||
        (i.vehicle?.plateNo || "").toLowerCase().includes(q) ||
        (i.vehicle?.make || "").toLowerCase().includes(q) ||
        TYPE_LABELS[i.type]?.toLowerCase().includes(q),
    );
  }, [inspections, activeTab, searchTerm]);

  const stats = useMemo(
    () => ({
      total: inspections.length,
      pre: inspections.filter((i) => i.type === "pre_departure").length,
      post: inspections.filter((i) => i.type === "post_departure").length,
      withIssues: inspections.filter((i) =>
        i.items.some((item) => item.status === "NOK"),
      ).length,
    }),
    [inspections],
  );

  const handleDelete = async (inspection) => {
    const confirm = await Swal.fire({
      title: "Delete inspection?",
      text: `This will permanently delete the ${TYPE_LABELS[inspection.type] || inspection.type} inspection for ${inspection.lead?.bookingRef || "this lead"}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch(`/inspections/${inspection.id}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(payload?.message || "Failed to delete inspection.");
      setInspections((prev) => prev.filter((i) => i.id !== inspection.id));
      if (selectedInspection?.id === inspection.id) setSelectedInspection(null);
      await Swal.fire({
        title: "Deleted",
        text: "Inspection deleted successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: err.message || "Failed to delete inspection.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDetail = async (inspection) => {
    setExpandedSections({});

    // Fetch full detail if items might not be loaded
    if (inspection.items.length === 0 && inspection.images.length === 0) {
      try {
        const res = await apiFetch(`/inspections/${inspection.id}`);
        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload?.inspection) {
          setSelectedInspection(normalizeInspection(payload.inspection));
          return;
        }
      } catch {
        // fall back to cached data
      }
    }
    setSelectedInspection(inspection);
  };

  const toggleSection = (title) =>
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));

  const groupedItems = useMemo(() => {
    if (!selectedInspection) return [];
    const map = new Map();
    [...selectedInspection.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item) => {
        const title = item.checklistTitle || "General";
        if (!map.has(title)) map.set(title, []);
        map.get(title).push(item);
      });
    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      items,
    }));
  }, [selectedInspection]);

  const nokCount = useMemo(
    () =>
      selectedInspection?.items.filter((i) => i.status === "NOK").length ?? 0,
    [selectedInspection],
  );

  const handleDownloadPdf = async (inspection) => {
    try {
      const res = await apiFetch(`/inspections/${inspection.id}/pdf`, {
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to download PDF.");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const filename = `inspection-checklist-${inspection.id}.pdf`;

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to download PDF.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inspections</h1>
          <p className="text-slate-500 mt-1">
            View pre and post departure vehicle inspection records.
          </p>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Pre Departure
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.pre}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Post Departure
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {stats.post}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            With Issues
          </p>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {stats.withIssues}
          </p>
        </div>
      </div>

      {/* Table card */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Tabs + Search */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 self-start">
            {[
              { key: "all", label: "All" },
              { key: "pre_departure", label: "Pre Departure" },
              { key: "post_departure", label: "Post Departure" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === key
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/20 transition-all lg:w-72">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search booking ref, client, vehicle…"
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Lead / Client</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-slate-400 text-sm"
                  >
                    Loading inspections…
                  </td>
                </tr>
              ) : filteredInspections.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-slate-400 text-sm"
                  >
                    No inspections found.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((inspection) => {
                  const okCount = inspection.items.filter(
                    (i) => i.status === "OK",
                  ).length;
                  const nokItems = inspection.items.filter(
                    (i) => i.status === "NOK",
                  ).length;
                  return (
                    <tr
                      key={inspection.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            inspection.type === "pre_departure"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {TYPE_LABELS[inspection.type] || inspection.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-700">
                          {inspection.lead?.bookingRef || "-"}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {inspection.lead?.clientCompany || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Car className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <div className="font-medium">
                              {inspection.vehicle?.plateNo || "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {[
                                inspection.vehicle?.make,
                                inspection.vehicle?.model,
                              ]
                                .filter(Boolean)
                                .join(" ") || ""}
                            </div>
                            <div className="text-xs text-slate-500">
                              Odo Out: {inspection.odometerOut ?? "-"} | Odo In:{" "}
                              {inspection.odometerIn ?? "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {okCount} OK
                          </span>
                          {nokItems > 0 && (
                            <span className="flex items-center gap-1 text-rose-600 font-medium">
                              <XCircle className="w-3.5 h-3.5" />
                              {nokItems} NOK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(inspection.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openDetail(inspection)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(inspection)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inspection)}
                            disabled={isDeleting}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedInspection(null)}
          />
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Inspection Details
                  </h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                      TYPE_COLORS[selectedInspection.type] ||
                      "bg-slate-700 text-slate-300 border-slate-600"
                    }`}
                  >
                    {TYPE_LABELS[selectedInspection.type] ||
                      selectedInspection.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInspection(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Booking Ref</span>
                  <span className="inline-flex items-center rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-300">
                    {selectedInspection.lead?.bookingRef || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Client</span>
                  <span className="text-white">
                    {selectedInspection.lead?.clientCompany || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Vehicle</span>
                  <span className="text-white">
                    {selectedInspection.vehicle?.plateNo || "-"}
                    {selectedInspection.vehicle?.make
                      ? ` — ${selectedInspection.vehicle.make} ${selectedInspection.vehicle.model || ""}`
                      : ""}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Date</span>
                  <span className="text-white">
                    {formatDate(selectedInspection.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Odometer Out</span>
                  <span className="text-white">
                    {selectedInspection.odometerOut ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Odometer In</span>
                  <span className="text-white">
                    {selectedInspection.odometerIn ?? "-"}
                  </span>
                </div>
                {selectedInspection.remarks && (
                  <div className="md:col-span-2 flex justify-between gap-4">
                    <span className="text-slate-400">Remarks</span>
                    <span className="text-white text-right">
                      {selectedInspection.remarks}
                    </span>
                  </div>
                )}
                <div className="md:col-span-2 flex items-center gap-4">
                  <span className="text-slate-400">Result</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {
                        selectedInspection.items.filter(
                          (i) => i.status === "OK",
                        ).length
                      }{" "}
                      OK
                    </span>
                    {nokCount > 0 && (
                      <span className="flex items-center gap-1 text-red-400 text-xs">
                        <XCircle className="w-3.5 h-3.5" />
                        {nokCount} NOK
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Checklist items grouped by title */}
              {groupedItems.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    Checklist Items
                  </h3>
                  {groupedItems.map(({ title, items }) => {
                    const isOpen = expandedSections[title] !== false; // default open
                    const sectionNok = items.filter(
                      (i) => i.status === "NOK",
                    ).length;
                    return (
                      <div
                        key={title}
                        className="border border-slate-700/50 rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(title)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {title}
                            </span>
                            {sectionNok > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">
                                {sectionNok} NOK
                              </span>
                            )}
                          </div>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="divide-y divide-slate-200 bg-white">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className={`px-4 py-3 flex items-start gap-3 ${
                                  item.status === "NOK" ? "bg-red-50" : ""
                                }`}
                              >
                                <div className="mt-0.5">
                                  {item.status === "OK" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-slate-900">
                                    {item.name?.trim() ||
                                      item.text?.trim() ||
                                      "Checklist item"}
                                  </div>
                                  {item.text && item.text !== item.name && (
                                    <div className="text-xs text-slate-700 mt-0.5">
                                      {item.text}
                                    </div>
                                  )}
                                  {item.status === "NOK" && item.issue && (
                                    <div className="mt-1 text-xs text-red-700 bg-red-100 border border-red-200 rounded px-2 py-1">
                                      Issue: {item.issue}
                                    </div>
                                  )}
                                </div>
                                <span
                                  className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${
                                    item.status === "OK"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  No checklist items recorded.
                </p>
              )}

              {/* Images */}
              {selectedInspection.images.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Photos ({selectedInspection.images.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedInspection.images
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((img) => {
                        const url = resolveImageUrl(img.path);
                        if (!url) return null;
                        return (
                          <a
                            key={img.id}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-slate-700/50 hover:border-amber-500/50 transition-colors"
                          >
                            <img
                              src={url}
                              alt={`Inspection photo ${img.id}`}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                e.currentTarget.parentElement.style.display =
                                  "none";
                              }}
                            />
                          </a>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center shrink-0">
              <button
                onClick={() => handleDownloadPdf(selectedInspection)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={() => setSelectedInspection(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
