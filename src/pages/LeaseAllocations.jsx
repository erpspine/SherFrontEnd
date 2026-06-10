import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];

const apiJson = async (path, options) => {
  const res = await apiFetch(path, options);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      payload?.message ||
      (payload?.errors
        ? Object.values(payload.errors).flat().join("\n")
        : null) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return payload;
};

const STATUS_STYLES = {
  Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cancelled: "bg-slate-200 text-slate-600 border-slate-300",
};

const emptyForm = () => ({
  id: null,
  leaseContractId: "",
  vehicleId: "",
  driverId: "",
  startDate: "",
  endDate: "",
  itinerary: "",
  itineraryItems: [{ date: "", details: "" }],
  fuelNotes: "",
  status: "Scheduled",
  notes: "",
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const extractContracts = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.contracts)) return payload.contracts;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const extractDrivers = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.drivers)) return payload.drivers;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const extractAllocations = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.allocations)) return payload.allocations;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const extractVehiclesPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.vehicles)) return payload.vehicles;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getVehicleDriverId = (vehicle) => {
  const id =
    vehicle?.assigned_driver_id ||
    vehicle?.assignedDriverId ||
    vehicle?.assigned_driver?.id ||
    vehicle?.assignedDriver?.id ||
    null;
  return id ? Number(id) : null;
};

const normalizeContract = (contract) => {
  const vehicles = Array.isArray(contract.vehicles)
    ? contract.vehicles.map((v) => ({
        id: Number(v.id),
        vehicleNo: v.vehicleNo || v.vehicle_no || "-",
        plateNo: v.plateNo || v.plate_no || "-",
        make: v.make || "",
        model: v.model || "",
      }))
    : [];
  return {
    id: Number(contract.id),
    clientName: contract.clientName || contract.client_name || "",
    leaseType: contract.leaseType || contract.lease_type || "",
    startDate: contract.startDate || contract.start_date || null,
    endDate: contract.endDate || contract.end_date || null,
    status: contract.status || "Active",
    vehicles,
  };
};

export default function LeaseAllocations() {
  const [contracts, setContracts] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [vehicleDriverMap, setVehicleDriverMap] = useState(new Map());
  const [driverVehicleMap, setDriverVehicleMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [contractFilter, setContractFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contractsRes, driversRes, allocationsRes, vehiclesRes] =
        await Promise.all([
          apiJson("/lease-contracts"),
          apiJson("/vehicles/drivers"),
          apiJson("/lease-allocations"),
          apiJson("/vehicles"),
        ]);
      setContracts(extractContracts(contractsRes).map(normalizeContract));
      setDrivers(extractDrivers(driversRes));
      const vMap = new Map();
      const dMap = new Map();
      extractVehiclesPayload(vehiclesRes).forEach((v) => {
        const vid = Number(v?.id || 0);
        const did = getVehicleDriverId(v);
        if (vid) {
          vMap.set(vid, did);
          if (did) dMap.set(did, vid);
        }
      });
      setVehicleDriverMap(vMap);
      setDriverVehicleMap(dMap);
      setAllocations(extractAllocations(allocationsRes));
    } catch (err) {
      setError(err.message || "Failed to load lease allocations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const contractMap = useMemo(() => {
    const map = new Map();
    contracts.forEach((c) => map.set(c.id, c));
    return map;
  }, [contracts]);

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status !== "Cancelled"),
    [contracts],
  );

  const selectedContract = useMemo(() => {
    if (!form.leaseContractId) return null;
    return contractMap.get(Number(form.leaseContractId)) || null;
  }, [form.leaseContractId, contractMap]);

  const filteredAllocations = useMemo(() => {
    const term = search.trim().toLowerCase();

    const overlapsRange = (allocation) => {
      if (!dateFrom && !dateTo) return true;

      const allocationStart = allocation?.startDate || "";
      const allocationEnd = allocation?.endDate || allocationStart;

      if (!allocationStart && !allocationEnd) return false;

      const effectiveStart = allocationStart || allocationEnd;
      const effectiveEnd = allocationEnd || allocationStart;

      if (dateFrom && effectiveEnd < dateFrom) return false;
      if (dateTo && effectiveStart > dateTo) return false;

      return true;
    };

    return allocations.filter((a) => {
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (
        contractFilter !== "All" &&
        Number(a.leaseContractId) !== Number(contractFilter)
      )
        return false;
      if (!overlapsRange(a)) return false;
      if (!term) return true;
      const haystack = [
        a.contract?.clientName,
        a.vehicle?.vehicleNo,
        a.vehicle?.plateNo,
        a.driver?.name,
        a.itinerary,
        a.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [allocations, search, statusFilter, contractFilter, dateFrom, dateTo]);

  const clientInsights = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) {
      return {
        clientName: "",
        scheduledCount: 0,
        totalTrips: 0,
      };
    }

    const matchingClients = Array.from(
      new Set(
        filteredAllocations
          .map((allocation) => allocation.contract?.clientName?.trim() || "")
          .filter((name) => name.toLowerCase().includes(searchTerm)),
      ),
    );

    if (matchingClients.length !== 1) {
      return {
        clientName: "",
        scheduledCount: 0,
        totalTrips: 0,
      };
    }

    const [matchedClient] = matchingClients;
    const clientRows = filteredAllocations.filter(
      (allocation) =>
        (allocation.contract?.clientName || "").toLowerCase() ===
        matchedClient.toLowerCase(),
    );

    return {
      clientName: matchedClient,
      scheduledCount: clientRows.filter(
        (allocation) => allocation.status === "Scheduled",
      ).length,
      totalTrips: clientRows.length,
    };
  }, [filteredAllocations, search]);

  const openCreate = () => {
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (allocation) => {
    setForm({
      id: allocation.id,
      leaseContractId: String(allocation.leaseContractId || ""),
      vehicleId: String(allocation.vehicleId || ""),
      driverId: allocation.driverId ? String(allocation.driverId) : "",
      startDate: allocation.startDate || "",
      endDate: allocation.endDate || "",
      itinerary: allocation.itinerary || "",
      itineraryItems:
        Array.isArray(allocation.itineraryItems) &&
        allocation.itineraryItems.length > 0
          ? allocation.itineraryItems.map((it) => ({
              date: it?.date || "",
              details: it?.details || "",
            }))
          : allocation.itinerary
            ? [{ date: "", details: allocation.itinerary }]
            : [{ date: "", details: "" }],
      fuelNotes: allocation.fuelNotes || "",
      status: allocation.status || "Scheduled",
      notes: allocation.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leaseContractId) {
      Swal.fire("Missing", "Please select a lease contract.", "warning");
      return;
    }
    if (!form.vehicleId) {
      Swal.fire("Missing", "Please select a vehicle.", "warning");
      return;
    }
    if (!form.startDate || !form.endDate) {
      Swal.fire("Missing", "Start and end dates are required.", "warning");
      return;
    }
    if (form.endDate < form.startDate) {
      Swal.fire("Invalid", "End date must be on/after start date.", "warning");
      return;
    }

    const cleanedItineraryItems = (form.itineraryItems || [])
      .map((it) => ({
        date: (it.date || "").trim(),
        details: (it.details || "").trim(),
      }))
      .filter((it) => it.date || it.details);

    const itineraryText =
      form.itinerary?.trim() ||
      cleanedItineraryItems
        .map((it) => [it.date, it.details].filter(Boolean).join(": "))
        .join("\n");

    const payload = {
      leaseContractId: Number(form.leaseContractId),
      vehicleId: Number(form.vehicleId),
      driverId: form.driverId ? Number(form.driverId) : null,
      startDate: form.startDate,
      endDate: form.endDate,
      itinerary: itineraryText || null,
      itineraryItems: cleanedItineraryItems,
      fuelNotes: form.fuelNotes || null,
      status: form.status,
      notes: form.notes || null,
    };

    setSaving(true);
    try {
      if (form.id) {
        await apiJson(`/lease-allocations/${form.id}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await apiJson("/lease-allocations", {
          method: "POST",
          body: payload,
        });
      }
      setShowModal(false);
      setForm(emptyForm());
      await loadAll();
      Swal.fire({
        icon: "success",
        title: form.id ? "Allocation updated" : "Allocation created",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", err.message || "Failed to save allocation.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (allocation) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete allocation?",
      text: `This will remove the trip allocation for ${allocation.vehicle?.vehicleNo || "vehicle"}.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!confirm.isConfirmed) return;
    try {
      await apiJson(`/lease-allocations/${allocation.id}`, {
        method: "DELETE",
      });
      await loadAll();
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", err.message || "Failed to delete.", "error");
    }
  };

  const stats = useMemo(() => {
    const total = filteredAllocations.length;
    const scheduled = filteredAllocations.filter(
      (a) => a.status === "Scheduled",
    ).length;
    const inProgress = filteredAllocations.filter(
      (a) => a.status === "In Progress",
    ).length;
    const completed = filteredAllocations.filter(
      (a) => a.status === "Completed",
    ).length;
    return { total, scheduled, inProgress, completed };
  }, [filteredAllocations]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Lease Allocations
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Per-trip allocations within a lease contract — assign vehicle,
            driver, itinerary, and fuel arrangements for each trip the client
            requests.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Allocation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total (Filtered)
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Scheduled
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {stats.scheduled}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            In Progress
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {stats.inProgress}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Completed
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {stats.completed}
          </p>
        </div>
      </div>

      {clientInsights.clientName && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Client{" "}
            <span className="font-semibold">{clientInsights.clientName}</span>{" "}
            has{" "}
            <span className="font-semibold">
              {clientInsights.scheduledCount}
            </span>{" "}
            scheduled safari
            {clientInsights.scheduledCount === 1 ? "" : "s"} in the selected
            duration.
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Total trips for this client in current filters:{" "}
            {clientInsights.totalTrips}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, vehicle, driver, itinerary..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="All">All Contracts</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clientName} ({c.leaseType})
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          max={dateTo || undefined}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          aria-label="Date from"
          title="Date from"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          min={dateFrom || undefined}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          aria-label="Date to"
          title="Date to"
        />
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatusFilter("All");
            setContractFilter("All");
            setDateFrom("");
            setDateTo("");
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
        >
          Clear Filters
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3">Contract / Client</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Itinerary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    <Loader className="w-5 h-5 animate-spin inline mr-2" />
                    Loading allocations...
                  </td>
                </tr>
              ) : filteredAllocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    <ClipboardList className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    No lease allocations found.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {a.contract?.clientName || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.contract?.leaseType || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {a.vehicle?.vehicleNo || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.vehicle?.plateNo || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {a.driver?.name || (
                        <span className="text-slate-400 italic">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {formatDate(a.startDate)}
                      <span className="text-slate-400 mx-1">→</span>
                      {formatDate(a.endDate)}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {Array.isArray(a.itineraryItems) &&
                      a.itineraryItems.length > 0 ? (
                        <div className="text-slate-700 space-y-1">
                          {a.itineraryItems.slice(0, 3).map((it, idx) => (
                            <div key={idx} className="text-xs">
                              {it.date && (
                                <span className="font-medium text-slate-900">
                                  {it.date}:{" "}
                                </span>
                              )}
                              <span className="line-clamp-1">{it.details}</span>
                            </div>
                          ))}
                          {a.itineraryItems.length > 3 && (
                            <div className="text-[10px] text-slate-400">
                              +{a.itineraryItems.length - 3} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-700 line-clamp-2 whitespace-pre-wrap">
                          {a.itinerary || (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full border ${STATUS_STYLES[a.status] || "bg-slate-100 text-slate-700"}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {form.id ? "Edit Lease Allocation" : "New Lease Allocation"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-slate-500 hover:text-slate-800"
                disabled={saving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Lease Contract *
                  </label>
                  <select
                    required
                    value={form.leaseContractId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        leaseContractId: e.target.value,
                        vehicleId: "",
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Select contract...</option>
                    {activeContracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} — {c.leaseType} (
                        {formatDate(c.startDate)} → {formatDate(c.endDate)})
                      </option>
                    ))}
                  </select>
                  {selectedContract && (
                    <p className="text-xs text-slate-500 mt-1">
                      Contract period: {formatDate(selectedContract.startDate)}{" "}
                      → {formatDate(selectedContract.endDate)} ·{" "}
                      {selectedContract.vehicles.length} vehicle(s) under
                      contract
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vehicle *
                  </label>
                  <select
                    required
                    value={form.vehicleId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const did = vId
                        ? vehicleDriverMap.get(Number(vId))
                        : null;
                      setForm((f) => ({
                        ...f,
                        vehicleId: vId,
                        driverId: did ? String(did) : f.driverId,
                      }));
                    }}
                    disabled={!selectedContract}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                  >
                    <option value="">
                      {selectedContract
                        ? "Select vehicle..."
                        : "Pick a contract first"}
                    </option>
                    {selectedContract?.vehicles.map((v) => {
                      const did = vehicleDriverMap.get(Number(v.id));
                      const driver = did
                        ? drivers.find((d) => Number(d.id) === Number(did))
                        : null;
                      return (
                        <option key={v.id} value={v.id}>
                          {v.vehicleNo} — {v.plateNo} ({v.make} {v.model})
                          {driver ? ` — Driver: ${driver.name}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Driver
                  </label>
                  <select
                    value={form.driverId}
                    onChange={(e) => {
                      const dId = e.target.value;
                      const linkedVehicleId = dId
                        ? driverVehicleMap.get(Number(dId))
                        : null;
                      // Only auto-fill the vehicle if the driver's vehicle is
                      // part of the selected lease contract.
                      const contractVehicleIds = selectedContract
                        ? selectedContract.vehicles.map((v) => Number(v.id))
                        : [];
                      const autoVehicle =
                        linkedVehicleId &&
                        contractVehicleIds.includes(Number(linkedVehicleId))
                          ? String(linkedVehicleId)
                          : null;
                      setForm((f) => ({
                        ...f,
                        driverId: dId,
                        vehicleId: autoVehicle || f.vehicleId,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Unassigned</option>
                    {drivers.map((d) => {
                      const vId = driverVehicleMap.get(Number(d.id));
                      const veh = vId
                        ? selectedContract?.vehicles.find(
                            (v) => Number(v.id) === Number(vId),
                          )
                        : null;
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name}
                          {veh ? ` — ${veh.vehicleNo} (${veh.plateNo})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    min={selectedContract?.startDate || undefined}
                    max={selectedContract?.endDate || undefined}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    min={
                      form.startDate || selectedContract?.startDate || undefined
                    }
                    max={selectedContract?.endDate || undefined}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">
                      Itinerary (provided by client)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          itineraryItems: [
                            ...(f.itineraryItems || []),
                            { date: "", details: "" },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add day
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(form.itineraryItems || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col md:flex-row gap-2 items-start"
                      >
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              itineraryItems: f.itineraryItems.map((it, i) =>
                                i === idx
                                  ? { ...it, date: e.target.value }
                                  : it,
                              ),
                            }))
                          }
                          min={
                            form.startDate ||
                            selectedContract?.startDate ||
                            undefined
                          }
                          max={
                            form.endDate ||
                            selectedContract?.endDate ||
                            undefined
                          }
                          className="md:w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={item.details}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              itineraryItems: f.itineraryItems.map((it, i) =>
                                i === idx
                                  ? { ...it, details: e.target.value }
                                  : it,
                              ),
                            }))
                          }
                          placeholder="Pickup at Nairobi → Maasai Mara"
                          className="flex-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => {
                              const next = (f.itineraryItems || []).filter(
                                (_, i) => i !== idx,
                              );
                              return {
                                ...f,
                                itineraryItems:
                                  next.length > 0
                                    ? next
                                    : [{ date: "", details: "" }],
                              };
                            })
                          }
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fuel Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.fuelNotes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fuelNotes: e.target.value }))
                    }
                    placeholder="Fuel arrangement, allocated liters, fuel cards..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {form.id ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
