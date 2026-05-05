import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  Clock3,
  Plus,
  Search,
  X,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const MIN_LONG_TERM_DAYS = 365;
const LEASE_CONTRACTS_STORAGE_KEY = "lease_contracts_v1";

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDate = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calcDays = (start, end) => {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return null;
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? Math.max(diff, 0) : null;
};

const toInputDate = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const createContractForm = () => ({
  vehicleIds: [],
  clientName: "",
  contractNo: "",
  startDate: "",
  endDate: "",
  monthlyRate: "",
  notes: "",
});

const readStoredContracts = () => {
  try {
    const raw = localStorage.getItem(LEASE_CONTRACTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStoredContracts = (contracts) => {
  localStorage.setItem(LEASE_CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));
};

const normalizeVehicle = (vehicle) => {
  const item = vehicle?.attributes
    ? { ...vehicle.attributes, id: vehicle.id }
    : vehicle;

  const leaseStartDate =
    item.lease_start_date ||
    item.leaseStartDate ||
    item.contract_start_date ||
    item.contractStartDate ||
    item.start_date ||
    item.startDate ||
    "";

  const leaseEndDate =
    item.lease_end_date ||
    item.leaseEndDate ||
    item.contract_end_date ||
    item.contractEndDate ||
    item.end_date ||
    item.endDate ||
    "";

  const leaseDays = calcDays(leaseStartDate, leaseEndDate);

  return {
    id: Number(item.id || 0),
    vehicleNo:
      item.vehicle_no ||
      item.vehicleNo ||
      item.vehicle_number ||
      item.vehicleNumber ||
      item.car_no ||
      item.carNo ||
      "-",
    plateNo:
      item.plate_no ||
      item.plateNo ||
      item.registration_no ||
      item.registrationNo ||
      "-",
    make: item.make || "",
    model: item.model || "",
    year: Number(item.year || 0),
    seats: Number(item.seats || 0),
    status: item.status || "Available",
    currentMileage: Number(
      item.current_mileage ??
        item.currentMileage ??
        item.initial_mileage ??
        item.initialMileage ??
        0,
    ),
    clientName:
      item.client_name ||
      item.clientName ||
      item.customer_name ||
      item.customerName ||
      item.company_name ||
      item.companyName ||
      "-",
    leaseStartDate,
    leaseEndDate,
    leaseDays,
  };
};

const extractVehicles = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.vehicles)) return payload.vehicles;
  return [];
};

const isLongTerm = (vehicle) =>
  vehicle.status === "On Lease" &&
  (vehicle.leaseDays === null || vehicle.leaseDays >= MIN_LONG_TERM_DAYS);

export default function LongTermLeasing() {
  const [vehicles, setVehicles] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(createContractForm());

  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await apiFetch("/vehicles");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load vehicles.");
        }

        const normalized = extractVehicles(payload).map(normalizeVehicle);
        setVehicles(normalized);
        setContracts(readStoredContracts());
      } catch (error) {
        setErrorMessage(
          error.message || "Failed to load long term leasing data.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicles();
  }, []);

  const activeVehicleLeaseSet = useMemo(() => {
    const ids = new Set();
    contracts
      .filter((item) => item.status === "Active")
      .forEach((item) => {
        if (Array.isArray(item.vehicleIds)) {
          item.vehicleIds.forEach((id) => ids.add(String(id)));
        } else if (item.vehicleId) {
          ids.add(String(item.vehicleId));
        }
      });
    return ids;
  }, [contracts]);

  const longTermContracts = useMemo(() => {
    const byVehicle = new Map(vehicles.map((v) => [String(v.id), v]));
    return contracts
      .map((contract) => {
        // support both legacy vehicleId (single) and new vehicleIds (array)
        const vIds = Array.isArray(contract.vehicleIds)
          ? contract.vehicleIds
          : contract.vehicleId
            ? [contract.vehicleId]
            : [];
        const contractVehicles = vIds
          .map((id) => byVehicle.get(String(id)))
          .filter(Boolean);
        const durationDays = calcDays(contract.startDate, contract.endDate);
        return {
          ...contract,
          durationDays,
          contractVehicles,
        };
      })
      .filter(
        (contract) =>
          contract.durationDays === null ||
          contract.durationDays >= MIN_LONG_TERM_DAYS,
      )
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [contracts, vehicles]);

  const legacyLongTermLeasedVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          isLongTerm(vehicle) && !activeVehicleLeaseSet.has(String(vehicle.id)),
      ),
    [vehicles, activeVehicleLeaseSet],
  );

  const filteredContracts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return longTermContracts;

    return longTermContracts.filter((contract) => {
      const vehicleText = (contract.contractVehicles || [])
        .map((v) => `${v.vehicleNo} ${v.plateNo} ${v.make} ${v.model}`)
        .join(" ");
      return [contract.contractNo, contract.clientName, vehicleText]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [longTermContracts, searchTerm]);

  const availableVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.status === "Available" &&
          !activeVehicleLeaseSet.has(String(vehicle.id)),
      ),
    [vehicles, activeVehicleLeaseSet],
  );

  const availableForModal = useMemo(
    () =>
      availableVehicles.filter(
        (vehicle) => !form.vehicleIds.map(String).includes(String(vehicle.id)),
      ),
    [availableVehicles, form.vehicleIds],
  );

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addVehicle = (id) => {
    if (!id || form.vehicleIds.map(String).includes(String(id))) return;
    setForm((prev) => ({
      ...prev,
      vehicleIds: [...prev.vehicleIds, Number(id)],
    }));
  };

  const removeVehicle = (id) => {
    setForm((prev) => ({
      ...prev,
      vehicleIds: prev.vehicleIds.filter((v) => String(v) !== String(id)),
    }));
  };

  const openCreate = () => {
    setForm(createContractForm());
    setIsModalOpen(true);
  };

  const handleCreateContract = async () => {
    if (
      form.vehicleIds.length === 0 ||
      !form.clientName ||
      !form.contractNo ||
      !form.startDate ||
      !form.endDate
    ) {
      setErrorMessage(
        "Please complete all required fields and add at least one vehicle.",
      );
      return;
    }

    const durationDays = calcDays(form.startDate, form.endDate);
    if (durationDays === null || durationDays < MIN_LONG_TERM_DAYS) {
      setErrorMessage("Long term lease must be one year (365 days) or more.");
      return;
    }

    if (
      contracts.some(
        (item) =>
          String(item.contractNo).toLowerCase() ===
          String(form.contractNo).toLowerCase(),
      )
    ) {
      setErrorMessage("Contract number already exists.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      // Block all selected vehicles via API
      for (const vId of form.vehicleIds) {
        const updateResponse = await apiFetch(`/vehicles/${vId}`, {
          method: "PUT",
          body: { status: "On Lease" },
        });
        const updatePayload = await updateResponse.json().catch(() => ({}));
        if (!updateResponse.ok) {
          throw new Error(
            updatePayload?.message ||
              `Failed to update vehicle ${vId} status to On Lease.`,
          );
        }
      }

      const newContract = {
        id: Date.now(),
        vehicleIds: form.vehicleIds.map(Number),
        contractNo: form.contractNo.trim(),
        clientName: form.clientName.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRate: form.monthlyRate,
        notes: form.notes,
        status: "Active",
        createdAt: new Date().toISOString(),
      };

      const nextContracts = [newContract, ...contracts];
      setContracts(nextContracts);
      writeStoredContracts(nextContracts);

      const blockedIds = new Set(form.vehicleIds.map(String));
      setVehicles((prev) =>
        prev.map((v) =>
          blockedIds.has(String(v.id)) ? { ...v, status: "On Lease" } : v,
        ),
      );

      setIsModalOpen(false);
      setForm(createContractForm());

      await Swal.fire({
        title: "Contract Created",
        text: `${form.vehicleIds.length} vehicle(s) assigned to long term lease and blocked from allocation.`,
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to create lease contract.");
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to create lease contract.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(
    () => ({
      totalLeased:
        longTermContracts.reduce(
          (sum, c) => sum + (c.contractVehicles?.length || 0),
          0,
        ) + legacyLongTermLeasedVehicles.length,
      contracts: longTermContracts.length,
      legacyLeased: legacyLongTermLeasedVehicles.length,
      averageDays: (() => {
        const values = longTermContracts
          .map((v) => v.durationDays)
          .filter((v) => typeof v === "number");
        if (values.length === 0) return 0;
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      })(),
    }),
    [longTermContracts, legacyLongTermLeasedVehicles],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Long Term Leasing
          </h1>
          <p className="text-slate-500 mt-1">
            Create lease contracts for one year or more and block leased
            vehicles from operational use.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New Lease Contract
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Long-Term Leased
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalLeased}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Contracts
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {stats.contracts}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Legacy Leased
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {stats.legacyLeased}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Avg Lease Days
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {stats.averageDays}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 focus-within:border-amber-400 transition-colors">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by contract no, client, vehicle or plate"
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Contract No</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Lease Start</th>
                <th className="px-4 py-3">Lease End</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Monthly Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Loading long term leased vehicles...
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    No long term lease contracts found.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                      {contract.contractNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(contract.contractVehicles || []).length === 0 ? (
                        <span className="text-slate-500">-</span>
                      ) : (
                        (contract.contractVehicles || []).map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center gap-1.5 mb-0.5"
                          >
                            <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{v.vehicleNo}</span>
                            <span className="text-xs text-slate-500">
                              ({v.plateNo})
                            </span>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {contract.clientName || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(contract.startDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDate(contract.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock3 className="w-4 h-4 text-slate-400" />
                        {contract.durationDays === null
                          ? "Unknown"
                          : `${contract.durationDays} days`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {contract.monthlyRate
                        ? Number(contract.monthlyRate).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isSaving) return;
              setIsModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                Create Lease Contract
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Vehicles <span className="text-red-400">*</span>
                  </label>
                  <select
                    value=""
                    onChange={(event) => addVehicle(event.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 mb-2"
                  >
                    <option value="">Add a vehicle...</option>
                    {availableForModal.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNo} ({vehicle.plateNo}) - {vehicle.make}{" "}
                        {vehicle.model}
                      </option>
                    ))}
                  </select>
                  {form.vehicleIds.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No vehicles added yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {form.vehicleIds.map((vId) => {
                        const v = vehicles.find(
                          (veh) => String(veh.id) === String(vId),
                        );
                        return (
                          <span
                            key={vId}
                            className="inline-flex items-center gap-1.5 bg-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5"
                          >
                            <Car className="w-3 h-3 text-amber-400" />
                            {v ? `${v.vehicleNo} (${v.plateNo})` : `ID:${vId}`}
                            <button
                              type="button"
                              onClick={() => removeVehicle(vId)}
                              className="ml-0.5 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Contract No <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.contractNo}
                    onChange={(event) =>
                      setField("contractNo", event.target.value)
                    }
                    placeholder="e.g. LSE-2026-001"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Client Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.clientName}
                    onChange={(event) =>
                      setField("clientName", event.target.value)
                    }
                    placeholder="Company or individual"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={toInputDate(form.startDate)}
                    onChange={(event) =>
                      setField("startDate", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    End Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={toInputDate(form.endDate)}
                    onChange={(event) =>
                      setField("endDate", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Monthly Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.monthlyRate}
                    onChange={(event) =>
                      setField("monthlyRate", event.target.value)
                    }
                    placeholder="Optional"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <p className="text-xs text-amber-300">
                Only contracts of {MIN_LONG_TERM_DAYS} days or more are accepted
                for long term leasing.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (isSaving) return;
                  setIsModalOpen(false);
                }}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContract}
                disabled={isSaving}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Create Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
