import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import Select from "react-select";
import { apiFetch } from "../utils/api";
import { canManageJobCardStatus } from "../utils/auth";

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

const searchableVehicleStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    backgroundColor: "#ffffff",
    borderColor: state.isFocused ? "#f59e0b" : "#cbd5e1",
    borderRadius: 8,
    boxShadow: "none",
    ":hover": { borderColor: "#f59e0b" },
  }),
  singleValue: (base) => ({ ...base, color: "#0f172a" }),
  input: (base) => ({ ...base, color: "#0f172a" }),
  placeholder: (base) => ({ ...base, color: "#64748b" }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: "#cbd5e1" }),
  dropdownIndicator: (base) => ({ ...base, color: "#64748b" }),
  clearIndicator: (base) => ({ ...base, color: "#64748b" }),
  menu: (base) => ({ ...base, backgroundColor: "#ffffff" }),
  menuList: (base) => ({ ...base, backgroundColor: "#ffffff" }),
  option: (base, state) => ({
    ...base,
    color: "#0f172a",
    backgroundColor: state.isSelected
      ? "#fde68a"
      : state.isFocused
        ? "#fef3c7"
        : "#ffffff",
    ":active": { backgroundColor: "#fde68a" },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const createEmptyVehicleRow = () => ({ vehicleId: "", driverId: "" });

const createEmptyDateRange = () => ({
  leaseContractId: "",
  startDate: "",
  endDate: "",
  pairs: [createEmptyVehicleRow()],
  itineraryItems: [{ date: "", details: "" }],
});

const emptyForm = () => ({
  id: null,
  parentCompanyId: "",
  ranges: [createEmptyDateRange()],
  fuelNotes: "",
  status: "Scheduled",
  notes: "",
  groupName: "",
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

const DAY_MS = 24 * 60 * 60 * 1000;

const parseIsoDate = (value) => {
  if (!value || typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
};

const toIsoDate = (utcMs) => {
  if (!Number.isFinite(utcMs)) return "";
  return new Date(utcMs).toISOString().slice(0, 10);
};

const populateItineraryDates = (items, startDate, endDate) => {
  const start = parseIsoDate(startDate || "");
  const end = parseIsoDate(endDate || "");

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return items?.length ? items : [{ date: "", details: "" }];
  }

  const existingItems = Array.isArray(items) ? items : [];
  const detailsByDate = new Map(
    existingItems
      .filter((item) => item?.date)
      .map((item) => [item.date, item.details || ""]),
  );

  const nextItems = [];
  for (let date = start; date <= end; date += DAY_MS) {
    const isoDate = toIsoDate(date);
    const existingByIndex = existingItems[nextItems.length];
    nextItems.push({
      date: isoDate,
      details: detailsByDate.get(isoDate) ?? existingByIndex?.details ?? "",
    });
  }

  return nextItems;
};

const insertItineraryDay = (items, index) => {
  const nextItems = [...(items || [])];
  nextItems.splice(index, 0, { date: "", details: "" });
  return nextItems;
};

const reorderItineraryDay = (items, fromIndex, toIndex) => {
  const nextItems = [...items];
  if (toIndex < 0 || toIndex >= nextItems.length) return nextItems;
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
};

const filenameFromHeader = (disposition, fallback) => {
  if (!disposition) return fallback;

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
};

const countInclusiveDaysInWindow = (allocation, fromDate, toDate) => {
  const allocationStart = parseIsoDate(allocation?.startDate || "");
  const allocationEnd = parseIsoDate(
    allocation?.endDate || allocation?.startDate || "",
  );

  if (!Number.isFinite(allocationStart) || !Number.isFinite(allocationEnd)) {
    return 0;
  }

  const rangeStart = parseIsoDate(fromDate || "") ?? allocationStart;
  const rangeEnd = parseIsoDate(toDate || "") ?? allocationEnd;

  const start = Math.max(allocationStart, rangeStart);
  const end = Math.min(allocationEnd, rangeEnd);

  if (end < start) return 0;
  return Math.floor((end - start) / DAY_MS) + 1;
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
    isParentCompany: Boolean(
      contract.isParentCompany ?? contract.is_parent_company,
    ),
    parentClientName:
      contract.parentClientName || contract.parent_client_name || "",
    groupName: contract.groupName || contract.group_name || "",
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
  const [jobCards, setJobCards] = useState([]);
  const [vehicleDriverMap, setVehicleDriverMap] = useState(new Map());
  const [driverVehicleMap, setDriverVehicleMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [contractFilter, setContractFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportType, setExportType] = useState("");
  const [clipOverlapDates, setClipOverlapDates] = useState(false);
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        contractsRes,
        driversRes,
        allocationsRes,
        vehiclesRes,
        jobCardsRes,
      ] = await Promise.all([
        apiJson("/lease-contracts"),
        apiJson("/vehicles/drivers"),
        apiJson("/lease-allocations"),
        apiJson("/vehicles"),
        apiJson("/job-cards").catch(() => ({ jobCards: [] })),
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
      setJobCards(
        Array.isArray(jobCardsRes?.jobCards) ? jobCardsRes.jobCards : [],
      );
    } catch (err) {
      setError(err.message || "Failed to load lease allocations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const jobCardForAllocation = (allocation) =>
    jobCards.find(
      (jobCard) =>
        String(jobCard.type || "")
          .trim()
          .toLowerCase() === "long term lease" &&
        Number(jobCard.leaseAllocationId ?? jobCard.lease_allocation_id) ===
          Number(allocation.id),
    );

  const contractMap = useMemo(() => {
    const map = new Map();
    contracts.forEach((c) => map.set(c.id, c));
    return map;
  }, [contracts]);

  const activeContracts = useMemo(
    () =>
      contracts.filter((c) => c.status !== "Cancelled" && !c.isParentCompany),
    [contracts],
  );

  const activeParentCompanies = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          contract.status !== "Cancelled" && contract.isParentCompany,
      ),
    [contracts],
  );

  const selectedParentCompany = useMemo(
    () =>
      activeParentCompanies.find(
        (company) => String(company.id) === String(form.parentCompanyId),
      ) || null,
    [activeParentCompanies, form.parentCompanyId],
  );

  const selectableLeaseContracts = useMemo(
    () =>
      activeContracts.filter((contract) =>
        selectedParentCompany
          ? contract.parentClientName === selectedParentCompany.clientName
          : !contract.parentClientName,
      ),
    [activeContracts, selectedParentCompany],
  );

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
      if (
        vehicleFilter !== "All" &&
        Number(a.vehicleId) !== Number(vehicleFilter)
      )
        return false;
      if (!overlapsRange(a)) return false;
      if (!term) return true;
      const haystack = [
        a.groupName,
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
  }, [
    allocations,
    search,
    statusFilter,
    contractFilter,
    vehicleFilter,
    dateFrom,
    dateTo,
  ]);

  const vehicleFilterOptions = useMemo(() => {
    const byId = new Map();
    allocations.forEach((allocation) => {
      const id = Number(allocation?.vehicle?.id || allocation?.vehicleId || 0);
      if (!id || byId.has(id)) return;

      const vehicleNo = allocation?.vehicle?.vehicleNo || "-";
      const plateNo = allocation?.vehicle?.plateNo || "";
      byId.set(id, {
        id,
        label: plateNo ? `${vehicleNo} (${plateNo})` : vehicleNo,
      });
    });

    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [allocations]);

  const clientInsights = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const allClients = Array.from(
      new Set(
        filteredAllocations
          .map((allocation) => allocation.contract?.clientName?.trim() || "")
          .filter(Boolean),
      ),
    );

    const matchingClients = searchTerm
      ? allClients.filter((name) => name.toLowerCase().includes(searchTerm))
      : allClients;

    const hasSingleClient = matchingClients.length === 1;
    const selectedClientName = hasSingleClient ? matchingClients[0] : "";

    const scopedRows = hasSingleClient
      ? filteredAllocations.filter(
          (allocation) =>
            (allocation.contract?.clientName || "").toLowerCase() ===
            selectedClientName.toLowerCase(),
        )
      : filteredAllocations;

    const scheduledSafariDays = scopedRows.reduce(
      (sum, allocation) =>
        allocation.status === "Scheduled"
          ? sum + countInclusiveDaysInWindow(allocation, dateFrom, dateTo)
          : sum,
      0,
    );

    const totalSafariDays = scopedRows.reduce(
      (sum, allocation) =>
        sum + countInclusiveDaysInWindow(allocation, dateFrom, dateTo),
      0,
    );

    return {
      clientName: selectedClientName,
      scheduledSafariDays,
      totalSafariDays,
      allocationCount: scopedRows.length,
      hasData: scopedRows.length > 0,
      appliesToAllClients: !hasSingleClient,
      rangeLabel:
        dateFrom || dateTo
          ? `${toIsoDate(parseIsoDate(dateFrom || "") ?? Number.NaN) || "Any"} to ${toIsoDate(parseIsoDate(dateTo || "") ?? Number.NaN) || "Any"}`
          : "all dates",
    };
  }, [filteredAllocations, search, dateFrom, dateTo]);

  const openCreate = () => {
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (allocation) => {
    const allocationContract = contractMap.get(
      Number(allocation.leaseContractId),
    );
    const parentCompany = allocationContract?.parentClientName
      ? activeParentCompanies.find(
          (company) =>
            company.clientName === allocationContract.parentClientName,
        )
      : null;
    setForm({
      id: allocation.id,
      parentCompanyId: parentCompany ? String(parentCompany.id) : "",
      ranges: [
        {
          leaseContractId: String(allocation.leaseContractId || ""),
          startDate: allocation.startDate || "",
          endDate: allocation.endDate || "",
          pairs: [
            {
              vehicleId: String(allocation.vehicleId || ""),
              driverId: allocation.driverId ? String(allocation.driverId) : "",
            },
          ],
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
        },
      ],
      fuelNotes: allocation.fuelNotes || "",
      status: allocation.status || "Scheduled",
      notes: allocation.notes || "",
      groupName: allocation.groupName || "",
    });
    setShowModal(true);
  };

  const handleReopenJobCard = async (jobCard) => {
    const confirmation = await Swal.fire({
      title: "Reopen job card?",
      text: `Reopen ${jobCard.jobCardNo || "this job card"}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, reopen",
      cancelButtonText: "Cancel",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const result = await apiJson(`/job-cards/${jobCard.id}/status`, {
        method: "PATCH",
        body: { status: "Open" },
      });
      setJobCards((current) =>
        current.map((card) =>
          Number(card.id) === Number(jobCard.id)
            ? { ...card, ...(result.jobCard || {}), status: "Open" }
            : card,
        ),
      );
      await Swal.fire({
        title: "Reopened",
        text: "Job card reopened.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        title: "Unable to Reopen",
        text: err.message,
        icon: "error",
      });
    }
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(emptyForm());
  };

  const addDateRange = () =>
    setForm((current) => ({
      ...current,
      ranges: [...current.ranges, createEmptyDateRange()],
    }));

  const removeDateRange = (rangeIdx) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.filter((_, index) => index !== rangeIdx),
    }));

  const updateRangeDate = (rangeIdx, field, value) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) => {
        if (index !== rangeIdx) return range;
        const nextRange = { ...range, [field]: value };
        if (field === "startDate" && nextRange.endDate < value) {
          nextRange.endDate = "";
        }
        return {
          ...nextRange,
          itineraryItems: populateItineraryDates(
            range.itineraryItems,
            nextRange.startDate,
            nextRange.endDate,
          ),
        };
      }),
    }));

  const addVehicleRow = (rangeIdx) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? { ...range, pairs: [...range.pairs, createEmptyVehicleRow()] }
          : range,
      ),
    }));

  const removeVehicleRow = (rangeIdx, pairIdx) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? {
              ...range,
              pairs: range.pairs.filter((_, rowIndex) => rowIndex !== pairIdx),
            }
          : range,
      ),
    }));

  const getVehiclesForRange = (rangeIdx, pairIdx) => {
    const range = form.ranges[rangeIdx];
    const rangeContract = contractMap.get(Number(range?.leaseContractId));
    if (!rangeContract || !range) return [];
    const otherSelectedVehicleIds = new Set(
      range.pairs
        .filter((_, index) => index !== pairIdx)
        .map((pair) => String(pair.vehicleId))
        .filter(Boolean),
    );
    const currentVehicleId = String(range.pairs[pairIdx]?.vehicleId || "");
    return rangeContract.vehicles.filter(
      (vehicle) =>
        String(vehicle.id) === currentVehicleId ||
        !otherSelectedVehicleIds.has(String(vehicle.id)),
    );
  };

  const handleVehicleChange = (rangeIdx, pairIdx, vehicleId) => {
    const driverId = vehicleId ? vehicleDriverMap.get(Number(vehicleId)) : "";
    const activeDriverId = drivers.some(
      (driver) => Number(driver.id) === Number(driverId),
    )
      ? String(driverId)
      : "";
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? {
              ...range,
              pairs: range.pairs.map((pair, rowIndex) =>
                rowIndex === pairIdx
                  ? { ...pair, vehicleId, driverId: activeDriverId }
                  : pair,
              ),
            }
          : range,
      ),
    }));
  };

  const updateVehicleRowDriver = (rangeIdx, pairIdx, driverId) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? {
              ...range,
              pairs: range.pairs.map((pair, rowIndex) =>
                rowIndex === pairIdx ? { ...pair, driverId } : pair,
              ),
            }
          : range,
      ),
    }));

  const updateItineraryItem = (rangeIdx, itemIdx, field, value) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? {
              ...range,
              itineraryItems: range.itineraryItems.map((item, itemIndex) =>
                itemIndex === itemIdx ? { ...item, [field]: value } : item,
              ),
            }
          : range,
      ),
    }));

  const addItineraryDay = (rangeIdx, insertIndex) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? {
              ...range,
              itineraryItems: insertItineraryDay(
                range.itineraryItems,
                insertIndex ?? range.itineraryItems.length,
              ),
            }
          : range,
      ),
    }));

  const moveItineraryDay = (rangeIdx, itemIdx, direction) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? {
              ...range,
              itineraryItems: reorderItineraryDay(
                range.itineraryItems,
                itemIdx,
                itemIdx + direction,
              ),
            }
          : range,
      ),
    }));

  const removeItineraryDay = (rangeIdx, itemIdx) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) => {
        if (index !== rangeIdx) return range;
        const itineraryItems = range.itineraryItems.filter(
          (_, itemIndex) => itemIndex !== itemIdx,
        );
        return {
          ...range,
          itineraryItems:
            itineraryItems.length > 0
              ? itineraryItems
              : [{ date: "", details: "" }],
        };
      }),
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.ranges.length === 0) {
      Swal.fire("Missing", "Please add at least one date range.", "warning");
      return;
    }

    const invalidRange = form.ranges.find(
      (range) =>
        !range.leaseContractId ||
        !contractMap.has(Number(range.leaseContractId)) ||
        !range.startDate ||
        !range.endDate ||
        range.endDate < range.startDate ||
        range.pairs.length === 0 ||
        range.pairs.some((pair) => !pair.vehicleId) ||
        new Set(range.pairs.map((pair) => String(pair.vehicleId))).size !==
          range.pairs.length,
    );
    if (invalidRange) {
      Swal.fire(
        "Missing or Invalid Details",
        "Each date range needs a lease contract, valid dates, and at least one vehicle. A vehicle can only be selected once in each range.",
        "warning",
      );
      return;
    }

    const buildPayload = (range, pair) => {
      const itineraryItems = (range.itineraryItems || [])
        .map((item) => ({
          date: (item.date || "").trim(),
          details: (item.details || "").trim(),
        }))
        .filter((item) => item.date || item.details);
      const itineraryText = itineraryItems
        .map((item) => [item.date, item.details].filter(Boolean).join(": "))
        .join("\n");

      return {
        leaseContractId: Number(range.leaseContractId),
        vehicleId: Number(pair.vehicleId),
        driverId: pair.driverId ? Number(pair.driverId) : null,
        startDate: range.startDate,
        endDate: range.endDate,
        itinerary: itineraryText || null,
        itineraryItems,
        fuelNotes: form.fuelNotes || null,
        status: form.status,
        notes: form.notes || null,
        groupName: form.groupName || null,
      };
    };

    setSaving(true);
    let createdCount = 0;
    try {
      if (form.id) {
        const range = form.ranges[0];
        const pair = range.pairs[0];
        await apiJson(`/lease-allocations/${form.id}`, {
          method: "PUT",
          body: buildPayload(range, pair),
        });

        // Editing starts from the existing allocation, but any additional
        // ranges added in the modal are separate allocations in the API.
        for (const extraRange of form.ranges.slice(1)) {
          for (const pair of extraRange.pairs) {
            await apiJson("/lease-allocations", {
              method: "POST",
              body: buildPayload(extraRange, pair),
            });
            createdCount += 1;
          }
        }
      } else {
        for (const range of form.ranges) {
          for (const pair of range.pairs) {
            await apiJson("/lease-allocations", {
              method: "POST",
              body: buildPayload(range, pair),
            });
            createdCount += 1;
          }
        }
      }
      setShowModal(false);
      setForm(emptyForm());
      await loadAll();
      Swal.fire({
        icon: "success",
        title: form.id ? "Allocation updated" : "Allocation created",
        text: form.id
          ? "Lease allocation updated successfully."
          : `${createdCount} allocation${createdCount === 1 ? "" : "s"} created successfully.`,
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire(
        createdCount > 0 ? "Partial Save" : "Error",
        createdCount > 0
          ? `${createdCount} allocation${createdCount === 1 ? "" : "s"} were created before the next row failed: ${err.message}`
          : err.message || "Failed to save allocation.",
        createdCount > 0 ? "warning" : "error",
      );
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

  const buildExportParams = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (contractFilter !== "All") params.set("leaseContractId", contractFilter);
    if (vehicleFilter !== "All") params.set("vehicleId", vehicleFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (clipOverlapDates) params.set("clipOverlapDates", "1");
    return params;
  };

  const handleExportExcel = async () => {
    setExportType("excel");
    try {
      const params = buildExportParams();
      const query = params.toString();
      const response = await apiFetch(
        `/lease-allocations/export/excel${query ? `?${query}` : ""}`,
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to export Excel.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filenameFromHeader(
        response.headers.get("content-disposition"),
        "lease-allocations-report.csv",
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      Swal.fire(
        "Export Failed",
        err.message || "Failed to export Excel.",
        "error",
      );
    } finally {
      setExportType("");
    }
  };

  const handleExportPdf = async () => {
    setExportType("pdf");
    try {
      const params = buildExportParams();
      const query = params.toString();
      const response = await apiFetch(
        `/lease-allocations/export/pdf${query ? `?${query}` : ""}`,
        { headers: { Accept: "application/pdf" } },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to export PDF.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filenameFromHeader(
        response.headers.get("content-disposition"),
        "lease-allocations-report.pdf",
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      Swal.fire(
        "Export Failed",
        err.message || "Failed to export PDF.",
        "error",
      );
    } finally {
      setExportType("");
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={clipOverlapDates}
              onChange={(event) => setClipOverlapDates(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Clip overlapping dates to filter period</span>
          </label>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={loading || exportType === "pdf"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
          >
            {exportType === "pdf" ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Exporting PDF...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> PDF Report
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || exportType === "excel"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {exportType === "excel" ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Exporting Excel...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Export Excel
              </>
            )}
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
          >
            <Plus className="w-4 h-4" /> New Allocation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total (Filtered)
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Scheduled
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {stats.scheduled}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            In Progress
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {stats.inProgress}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Completed
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {stats.completed}
          </p>
        </div>
      </div>

      {clientInsights.hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            {clientInsights.appliesToAllClients ? (
              <>
                Vehicles are on safari for{" "}
                <span className="font-semibold">
                  {clientInsights.scheduledSafariDays}
                </span>{" "}
                scheduled day
                {clientInsights.scheduledSafariDays === 1 ? "" : "s"} in the
                selected duration.
              </>
            ) : (
              <>
                Client{" "}
                <span className="font-semibold">
                  {clientInsights.clientName}
                </span>{" "}
                has vehicles on safari for{" "}
                <span className="font-semibold">
                  {clientInsights.scheduledSafariDays}
                </span>{" "}
                scheduled day
                {clientInsights.scheduledSafariDays === 1 ? "" : "s"} in the
                selected duration.
              </>
            )}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Total safari vehicle-days in current filters:{" "}
            <span className="font-semibold">
              {clientInsights.totalSafariDays}
            </span>{" "}
            across{" "}
            <span className="font-semibold">
              {clientInsights.allocationCount}
            </span>{" "}
            allocation{clientInsights.allocationCount === 1 ? "" : "s"} (
            {clientInsights.rangeLabel}).
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap gap-3 items-center">
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
          {activeContracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parentClientName ? `${c.parentClientName} → ` : ""}
              {c.clientName} ({c.leaseType})
            </option>
          ))}
        </select>
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="All">All Vehicles</option>
          {vehicleFilterOptions.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
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
            setVehicleFilter("All");
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
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="table-head-gradient border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Client / Group</th>
                <th className="px-4 py-3">Group Name</th>
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
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    <Loader className="w-5 h-5 animate-spin inline mr-2" />
                    Loading allocations...
                  </td>
                </tr>
              ) : filteredAllocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {a.contract?.clientName || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.contract?.leaseType || ""}
                      </div>
                      {contractMap.get(Number(a.leaseContractId))
                        ?.parentClientName && (
                        <div className="mt-1 text-xs text-amber-700">
                          Parent:{" "}
                          {
                            contractMap.get(Number(a.leaseContractId))
                              .parentClientName
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {a.groupName || (
                        <span className="text-slate-400 italic">—</span>
                      )}
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
                        onClick={() => navigate(`/lease-allocations/${a.id}`)}
                        className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded"
                        title="View allocation"
                        aria-label={`View lease allocation ${a.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canManageJobCardStatus() &&
                        jobCardForAllocation(a) &&
                        (jobCardForAllocation(a).status === "Closed" ? (
                          <button
                            onClick={() =>
                              handleReopenJobCard(jobCardForAllocation(a))
                            }
                            className="px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg"
                            title="Reopen linked job card"
                          >
                            Open Job Card
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              navigate(
                                `/job-cards/?form=close&id=${encodeURIComponent(jobCardForAllocation(a).id)}`,
                              )
                            }
                            className="px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                            title="Close linked job card"
                          >
                            Close Job Card
                          </button>
                        ))}
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
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {form.id ? "Edit Lease Allocation" : "New Lease Allocation"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                disabled={saving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Parent Company
                  </label>
                  <select
                    value={form.parentCompanyId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        parentCompanyId: event.target.value,
                        ranges: [createEmptyDateRange()],
                      }))
                    }
                    disabled={saving}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                  >
                    <option value="">No parent / standalone contract</option>
                    {activeParentCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.clientName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={form.groupName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, groupName: e.target.value }))
                    }
                    placeholder="e.g., Smith Family, ABC Tour Group"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-xs font-medium text-slate-700">
                      Date Ranges With Vehicle Allocation
                    </label>
                  </div>

                  {form.ranges.map((range, rangeIdx) => {
                    const rangeContract = contractMap.get(
                      Number(range.leaseContractId),
                    );
                    const rangeContractOptions = [
                      ...selectableLeaseContracts,
                      ...(rangeContract &&
                      !selectableLeaseContracts.some(
                        (contract) => contract.id === rangeContract.id,
                      )
                        ? [rangeContract]
                        : []),
                    ];

                    return (
                      <div key={rangeIdx} className="contents">
                        <div className="order-1 space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-700">
                              Range {rangeIdx + 1}
                            </p>
                            {form.ranges.length > 1 &&
                              (!form.id || rangeIdx > 0) && (
                                <button
                                  type="button"
                                  onClick={() => removeDateRange(rangeIdx)}
                                  disabled={saving}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                >
                                  Remove Range
                                </button>
                              )}
                          </div>

                          <label className="block text-xs font-medium text-slate-700">
                            Lease Contract *
                            <select
                              required
                              value={range.leaseContractId}
                              onChange={(event) => {
                                const contractId = event.target.value;
                                const contract = activeContracts.find(
                                  (item) =>
                                    String(item.id) === String(contractId),
                                );
                                setForm((current) => ({
                                  ...current,
                                  groupName:
                                    current.groupName ||
                                    contract?.groupName ||
                                    "",
                                  ranges: current.ranges.map((item, index) =>
                                    index === rangeIdx
                                      ? {
                                          ...createEmptyDateRange(),
                                          leaseContractId: contractId,
                                        }
                                      : item,
                                  ),
                                }));
                              }}
                              disabled={
                                saving || selectableLeaseContracts.length === 0
                              }
                              className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 disabled:opacity-50"
                            >
                              <option value="">
                                {selectedParentCompany
                                  ? selectableLeaseContracts.length
                                    ? "Select child lease contract..."
                                    : `No active child contracts for ${selectedParentCompany.clientName}`
                                  : "Select standalone lease contract..."}
                              </option>
                              {rangeContractOptions.map((contract) => (
                                <option key={contract.id} value={contract.id}>
                                  {contract.clientName} — {contract.leaseType} (
                                  {formatDate(contract.startDate)} →{" "}
                                  {formatDate(contract.endDate)})
                                </option>
                              ))}
                            </select>
                            {selectedParentCompany && (
                              <span className="mt-1 block text-xs font-normal text-slate-600">
                                Choose any child contract under{" "}
                                {selectedParentCompany.clientName} for this
                                range.
                              </span>
                            )}
                            {rangeContract && (
                              <span className="mt-1 block text-xs font-normal text-slate-600">
                                {rangeContract.vehicles.length} vehicle(s) in
                                this contract.
                              </span>
                            )}
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="block text-xs text-slate-600">
                              From Date *
                              <input
                                type="date"
                                required
                                value={range.startDate}
                                min={rangeContract?.startDate || undefined}
                                max={rangeContract?.endDate || undefined}
                                onChange={(event) =>
                                  updateRangeDate(
                                    rangeIdx,
                                    "startDate",
                                    event.target.value,
                                  )
                                }
                                disabled={saving}
                                className="mt-1 w-full [color-scheme:light] bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                              />
                            </label>
                            <label className="block text-xs text-slate-600">
                              To Date *
                              <input
                                type="date"
                                required
                                value={range.endDate}
                                min={
                                  range.startDate ||
                                  rangeContract?.startDate ||
                                  undefined
                                }
                                max={rangeContract?.endDate || undefined}
                                onChange={(event) =>
                                  updateRangeDate(
                                    rangeIdx,
                                    "endDate",
                                    event.target.value,
                                  )
                                }
                                disabled={saving}
                                className="mt-1 w-full [color-scheme:light] bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                              />
                            </label>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-slate-700">
                              Vehicles and drivers
                            </p>
                            {!form.id && (
                              <button
                                type="button"
                                onClick={() => addVehicleRow(rangeIdx)}
                                disabled={saving || !rangeContract}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Vehicle Row
                              </button>
                            )}
                          </div>

                          {range.pairs.map((pair, pairIdx) => (
                            <div
                              key={`${rangeIdx}-${pairIdx}`}
                              className="grid grid-cols-1 md:grid-cols-2 gap-3"
                            >
                              <label className="block text-xs text-slate-600">
                                Vehicle
                                {range.pairs.length > 1
                                  ? ` ${pairIdx + 1}`
                                  : ""}{" "}
                                *
                                <Select
                                  inputId={`lease-vehicle-${rangeIdx}-${pairIdx}`}
                                  options={getVehiclesForRange(
                                    rangeIdx,
                                    pairIdx,
                                  )}
                                  value={
                                    getVehiclesForRange(rangeIdx, pairIdx).find(
                                      (vehicle) =>
                                        String(vehicle.id) ===
                                        String(pair.vehicleId),
                                    ) || null
                                  }
                                  getOptionValue={(vehicle) =>
                                    String(vehicle.id)
                                  }
                                  getOptionLabel={(vehicle) => {
                                    const assignedDriverId =
                                      vehicleDriverMap.get(Number(vehicle.id));
                                    const assignedDriver = drivers.find(
                                      (driver) =>
                                        Number(driver.id) ===
                                        Number(assignedDriverId),
                                    );
                                    return [
                                      vehicle.plateNo || vehicle.vehicleNo,
                                      vehicle.plateNo &&
                                      vehicle.vehicleNo !== vehicle.plateNo
                                        ? vehicle.vehicleNo
                                        : "",
                                      [vehicle.make, vehicle.model]
                                        .filter(Boolean)
                                        .join(" "),
                                      assignedDriver
                                        ? `Driver: ${assignedDriver.name}`
                                        : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" · ");
                                  }}
                                  onChange={(vehicle) =>
                                    handleVehicleChange(
                                      rangeIdx,
                                      pairIdx,
                                      vehicle ? String(vehicle.id) : "",
                                    )
                                  }
                                  isDisabled={saving || !rangeContract}
                                  isSearchable
                                  isClearable
                                  placeholder={
                                    rangeContract
                                      ? "Search vehicle registration or name..."
                                      : "Choose a lease contract first"
                                  }
                                  noOptionsMessage={() =>
                                    "No matching vehicles"
                                  }
                                  menuPortalTarget={document.body}
                                  menuPosition="fixed"
                                  className="mt-1 text-sm"
                                  styles={searchableVehicleStyles}
                                />
                              </label>

                              <div className="flex items-end gap-2">
                                <label className="block flex-1 text-xs text-slate-600">
                                  Driver
                                  {range.pairs.length > 1
                                    ? ` ${pairIdx + 1}`
                                    : ""}
                                  <select
                                    value={pair.driverId}
                                    onChange={(event) =>
                                      updateVehicleRowDriver(
                                        rangeIdx,
                                        pairIdx,
                                        event.target.value,
                                      )
                                    }
                                    disabled={saving}
                                    className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                                  >
                                    <option value="">Unassigned</option>
                                    {drivers.map((driver) => {
                                      const vehicleId = driverVehicleMap.get(
                                        Number(driver.id),
                                      );
                                      const vehicle = vehicleId
                                        ? rangeContract?.vehicles.find(
                                            (item) =>
                                              Number(item.id) ===
                                              Number(vehicleId),
                                          )
                                        : null;
                                      return (
                                        <option
                                          key={driver.id}
                                          value={driver.id}
                                        >
                                          {driver.name}
                                          {vehicle
                                            ? ` — ${vehicle.vehicleNo} (${vehicle.plateNo})`
                                            : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </label>
                                {!form.id && range.pairs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeVehicleRow(rangeIdx, pairIdx)
                                    }
                                    disabled={saving}
                                    className="mb-0.5 p-2.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                    title="Remove vehicle row"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {rangeIdx === 0 && (
                            <div className="flex justify-end border-t border-slate-200 pt-3">
                              <button
                                type="button"
                                onClick={addDateRange}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Date Range
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="order-[100] space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <p className="text-xs font-medium text-slate-700">
                              Itinerary by date
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addItineraryDay(rangeIdx, 0)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add at top
                              </button>
                              <button
                                type="button"
                                onClick={() => addItineraryDay(rangeIdx)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add day at
                                bottom
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {range.itineraryItems.map((item, itemIdx) => (
                              <div
                                key={`${rangeIdx}-day-${itemIdx}`}
                                className="flex flex-col md:flex-row gap-2 items-start"
                              >
                                <input
                                  type="date"
                                  value={item.date}
                                  min={range.startDate || undefined}
                                  max={range.endDate || undefined}
                                  onChange={(event) =>
                                    updateItineraryItem(
                                      rangeIdx,
                                      itemIdx,
                                      "date",
                                      event.target.value,
                                    )
                                  }
                                  disabled={saving}
                                  className="md:w-40 [color-scheme:light] bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                                />
                                <input
                                  type="text"
                                  value={item.details}
                                  onChange={(event) =>
                                    updateItineraryItem(
                                      rangeIdx,
                                      itemIdx,
                                      "details",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Pickup at Nairobi → Maasai Mara"
                                  disabled={saving}
                                  className="flex-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500"
                                />
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveItineraryDay(rangeIdx, itemIdx, -1)
                                    }
                                    disabled={saving || itemIdx === 0}
                                    className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Move itinerary day up"
                                    aria-label={`Move itinerary day ${itemIdx + 1} up`}
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveItineraryDay(rangeIdx, itemIdx, 1)
                                    }
                                    disabled={
                                      saving ||
                                      itemIdx ===
                                        range.itineraryItems.length - 1
                                    }
                                    className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Move itinerary day down"
                                    aria-label={`Move itinerary day ${itemIdx + 1} down`}
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addItineraryDay(rangeIdx, itemIdx)
                                    }
                                    disabled={saving}
                                    className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                    title="Add itinerary day above"
                                  >
                                    + Above
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addItineraryDay(rangeIdx, itemIdx + 1)
                                    }
                                    disabled={saving}
                                    className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                    title="Add itinerary day below"
                                  >
                                    + Below
                                  </button>
                                </div>
                                {range.itineraryItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeItineraryDay(rangeIdx, itemIdx)
                                    }
                                    disabled={saving}
                                    className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                    title="Remove itinerary day"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Fuel Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.fuelNotes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fuelNotes: e.target.value }))
                    }
                    placeholder="Fuel arrangement, allocated liters, fuel cards..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Internal Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
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
