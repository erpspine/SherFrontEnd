import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  Clock3,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const ONE_MONTH_DAYS = 30;
const ONE_YEAR_DAYS = 365;

const extractContracts = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.contracts)) return payload.contracts;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeContract = (contract) => {
  const vehicleIds = Array.isArray(contract.vehicleIds)
    ? contract.vehicleIds.map(Number)
    : Array.isArray(contract.vehicles)
      ? contract.vehicles.map((v) => Number(v.id))
      : contract.vehicleId
        ? [Number(contract.vehicleId)]
        : [];
  return {
    id: contract.id,
    vehicleIds,
    clientName: contract.clientName || contract.client_name || "",
    startDate: contract.startDate || contract.start_date || "",
    endDate: contract.endDate || contract.end_date || "",
    leaseType: contract.leaseType || contract.lease_type || "",
    monthlyRate: contract.monthlyRate ?? contract.monthly_rate ?? "",
    notes: contract.notes || "",
    status: contract.status || "Active",
    createdAt: contract.createdAt || contract.created_at || "",
  };
};

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

const getLeaseType = (startDate, endDate) => {
  const days = calcDays(startDate, endDate);
  if (days === null) return "Unknown";
  if (days < ONE_MONTH_DAYS) return "Daily Lease";
  if (days > ONE_YEAR_DAYS) return "Long-Term Lease";
  return "Short-Term Lease";
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
  startDate: "",
  endDate: "",
  monthlyRate: "",
  notes: "",
  documents: [],
});

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
    reader.readAsDataURL(file);
  });

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
    driverName:
      item.assigned_driver?.name ||
      item.assignedDriver?.name ||
      item.driver_name ||
      item.driverName ||
      "",
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

const isLeasedVehicle = (vehicle) => vehicle.status === "On Lease";

export default function LongTermLeasing() {
  const [vehicles, setVehicles] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createContractForm());

  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [vehiclesRes, contractsRes] = await Promise.all([
          apiFetch("/vehicles"),
          apiFetch("/lease-contracts"),
        ]);
        const vehiclesPayload = await vehiclesRes.json().catch(() => ({}));
        if (!vehiclesRes.ok) {
          throw new Error(
            vehiclesPayload?.message || "Failed to load vehicles.",
          );
        }
        const contractsPayload = await contractsRes.json().catch(() => ({}));
        if (!contractsRes.ok) {
          throw new Error(
            contractsPayload?.message || "Failed to load lease contracts.",
          );
        }

        const normalized =
          extractVehicles(vehiclesPayload).map(normalizeVehicle);
        setVehicles(normalized);
        setContracts(extractContracts(contractsPayload).map(normalizeContract));
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
      .filter((item) => item.status === "Active" && item.id !== editingId)
      .forEach((item) => {
        if (Array.isArray(item.vehicleIds)) {
          item.vehicleIds.forEach((id) => ids.add(String(id)));
        } else if (item.vehicleId) {
          ids.add(String(item.vehicleId));
        }
      });
    return ids;
  }, [contracts, editingId]);

  const leaseContracts = useMemo(() => {
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
          leaseType:
            contract.leaseType ||
            getLeaseType(contract.startDate, contract.endDate),
          contractVehicles,
        };
      })
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [contracts, vehicles]);

  const legacyLeasedVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          isLeasedVehicle(vehicle) &&
          !activeVehicleLeaseSet.has(String(vehicle.id)),
      ),
    [vehicles, activeVehicleLeaseSet],
  );

  const filteredContracts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return leaseContracts;

    return leaseContracts.filter((contract) => {
      const vehicleText = (contract.contractVehicles || [])
        .map((v) => `${v.vehicleNo} ${v.plateNo} ${v.make} ${v.model}`)
        .join(" ");
      return [contract.clientName, contract.leaseType, vehicleText]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [leaseContracts, searchTerm]);

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

  const handleContractDocuments = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      const documents = [];

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(
            `${file.name} is larger than 5MB. Please upload smaller files.`,
          );
        }

        const dataUrl = await readFileAsDataUrl(file);
        documents.push({
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        });
      }

      setForm((prev) => ({
        ...prev,
        documents: [...prev.documents, ...documents],
      }));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Failed to attach contract documents.");
    } finally {
      event.target.value = "";
    }
  };

  const removeContractDocument = (documentId) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((doc) => doc.id !== documentId),
    }));
  };

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
    setEditingId(null);
    setForm(createContractForm());
    setIsModalOpen(true);
  };

  const openEdit = (contract) => {
    setEditingId(contract.id);
    setForm({
      vehicleIds: Array.isArray(contract.vehicleIds)
        ? contract.vehicleIds.map(Number)
        : [],
      clientName: contract.clientName || "",
      startDate: toInputDate(contract.startDate) || "",
      endDate: toInputDate(contract.endDate) || "",
      monthlyRate:
        contract.monthlyRate === null || contract.monthlyRate === undefined
          ? ""
          : String(contract.monthlyRate),
      notes: contract.notes || "",
      documents: Array.isArray(contract.documents) ? contract.documents : [],
    });
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const handleDeleteContract = async (contract) => {
    const result = await Swal.fire({
      title: "Delete Lease Contract?",
      text: `This will remove the contract for ${contract.clientName || "this client"} and release its vehicles. This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#475569",
      background: "#0f172a",
      color: "#e2e8f0",
    });
    if (!result.isConfirmed) return;

    try {
      const response = await apiFetch(`/lease-contracts/${contract.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to delete lease contract.");
      }
      const releasedIds = new Set(
        (contract.vehicleIds || []).map((id) => String(id)),
      );
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
      setVehicles((prev) =>
        prev.map((v) =>
          releasedIds.has(String(v.id)) ? { ...v, status: "Available" } : v,
        ),
      );
      await Swal.fire({
        title: "Deleted",
        text: "Lease contract deleted and vehicles released.",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to delete lease contract.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleSaveContract = async () => {
    if (!form.clientName || !form.startDate || !form.endDate) {
      setErrorMessage(
        "Please complete all required fields (client, start date, end date).",
      );
      return;
    }

    const durationDays = calcDays(form.startDate, form.endDate);
    if (durationDays === null) {
      setErrorMessage("Lease start date and end date are required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const isEdit = Boolean(editingId);
      const response = await apiFetch(
        isEdit ? `/lease-contracts/${editingId}` : "/lease-contracts",
        {
          method: isEdit ? "PUT" : "POST",
          body: {
            vehicleIds: form.vehicleIds.map(Number),
            clientName: form.clientName.trim(),
            startDate: form.startDate,
            endDate: form.endDate,
            monthlyRate: form.monthlyRate ? Number(form.monthlyRate) : null,
            notes: form.notes || null,
          },
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message ||
            (isEdit
              ? "Failed to update lease contract."
              : "Failed to create lease contract."),
        );
      }

      const savedContract = normalizeContract(payload.contract || {});

      if (isEdit) {
        const previous = contracts.find((c) => c.id === editingId);
        const previousIds = new Set((previous?.vehicleIds || []).map(String));
        const newIds = new Set(savedContract.vehicleIds.map(String));
        const removedIds = [...previousIds].filter((id) => !newIds.has(id));
        setContracts((prev) =>
          prev.map((c) => (c.id === editingId ? savedContract : c)),
        );
        setVehicles((prev) =>
          prev.map((v) => {
            if (newIds.has(String(v.id))) return { ...v, status: "On Lease" };
            if (removedIds.includes(String(v.id)))
              return { ...v, status: "Available" };
            return v;
          }),
        );
      } else {
        setContracts((prev) => [savedContract, ...prev]);
        const blockedIds = new Set(savedContract.vehicleIds.map(String));
        setVehicles((prev) =>
          prev.map((v) =>
            blockedIds.has(String(v.id)) ? { ...v, status: "On Lease" } : v,
          ),
        );
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm(createContractForm());

      await Swal.fire({
        title: isEdit ? "Contract Updated" : "Contract Created",
        text: isEdit
          ? "Lease contract updated successfully."
          : savedContract.vehicleIds.length === 0
            ? "Lease contract created without a vehicle. You can assign vehicles later via Edit."
            : `${savedContract.vehicleIds.length} vehicle(s) assigned to lease and blocked from allocation.`,
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save lease contract.");
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to save lease contract.",
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
        leaseContracts.reduce(
          (sum, c) => sum + (c.contractVehicles?.length || 0),
          0,
        ) + legacyLeasedVehicles.length,
      contracts: leaseContracts.length,
      dailyLease: leaseContracts.filter((c) => c.leaseType === "Daily Lease")
        .length,
      shortTermLease: leaseContracts.filter(
        (c) => c.leaseType === "Short-Term Lease",
      ).length,
      longTermLease:
        leaseContracts.filter((c) => c.leaseType === "Long-Term Lease").length +
        legacyLeasedVehicles.filter(
          (vehicle) =>
            getLeaseType(vehicle.leaseStartDate, vehicle.leaseEndDate) ===
            "Long-Term Lease",
        ).length,
      averageDays: (() => {
        const values = leaseContracts
          .map((v) => v.durationDays)
          .filter((v) => typeof v === "number");
        if (values.length === 0) return 0;
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      })(),
    }),
    [leaseContracts, legacyLeasedVehicles],
  );

  const draftLeaseType = useMemo(
    () => getLeaseType(form.startDate, form.endDate),
    [form.startDate, form.endDate],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lease Contracts</h1>
          <p className="text-slate-500 mt-1">
            Manage daily, short-term, and long-term lease contracts and block
            leased vehicles from operational use.
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
            Total Leased
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalLeased}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Daily Lease
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {stats.dailyLease}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Short-Term Lease
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {stats.shortTermLease}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Long-Term Lease
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {stats.longTermLease}
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
            placeholder="Search by client, vehicle or plate"
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="table-head-gradient text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Lease Start</th>
                <th className="px-4 py-3">Lease End</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Lease Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Monthly Rate</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Loading lease contracts...
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    No lease contracts found.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
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
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {contract.leaseType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          contract.status === "Active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {contract.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {contract.monthlyRate
                        ? Number(contract.monthlyRate).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {Array.isArray(contract.documents) &&
                      contract.documents.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {contract.documents.map((doc) => (
                            <a
                              key={doc.id || doc.name}
                              href={doc.dataUrl}
                              download={doc.name}
                              className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              {doc.name}
                            </a>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(contract)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit contract"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContract(contract)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-700 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          title="Delete contract"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
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
                {editingId ? "Edit Lease Contract" : "Create Lease Contract"}
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
                    Vehicles{" "}
                    <span className="text-slate-500 font-normal">
                      (optional — can be added later)
                    </span>
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
                        {vehicle.driverName
                          ? ` — Driver: ${vehicle.driverName}`
                          : " — No driver assigned"}
                      </option>
                    ))}
                  </select>
                  {form.vehicleIds.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No vehicles added yet. You can save the lease without a
                      vehicle and assign one later.
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
                            {v?.driverName && (
                              <span className="text-amber-300/90">
                                · {v.driverName}
                              </span>
                            )}
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

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Lease Contracts / Documents
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleContractDocuments}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-amber-600"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    You can upload PDF, DOC, DOCX, JPG, or PNG files (max 5MB
                    each).
                  </p>
                  {form.documents.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.documents.map((doc) => (
                        <span
                          key={doc.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-200"
                        >
                          {doc.name}
                          <button
                            type="button"
                            onClick={() => removeContractDocument(doc.id)}
                            className="text-slate-400 hover:text-red-400"
                            title="Remove document"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-amber-300">
                Lease type is auto-classified by duration: Daily Lease (&lt; 1
                month), Short-Term Lease (1 month to 1 year), and Long-Term
                Lease (&gt; 1 year).
              </p>
              <p className="text-xs text-cyan-300">
                Draft classification: <strong>{draftLeaseType}</strong>
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
                onClick={handleSaveContract}
                disabled={isSaving}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? "Update Contract"
                    : "Create Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
