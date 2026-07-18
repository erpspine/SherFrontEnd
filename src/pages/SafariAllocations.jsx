import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  ClipboardList,
  Edit,
  FileText,
  MapPin,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const DEFAULT_VEHICLE_LEASE_TYPE = "Short-Term Lease";
const VEHICLE_LEASE_TYPES = ["Short-Term Lease", "Long-Term Lease"];

const createFormState = () => ({
  leadId: "",
  ranges: [
    {
      startDate: "",
      endDate: "",
      pairs: [
        {
          vehicleLeaseType: DEFAULT_VEHICLE_LEASE_TYPE,
          vehicleId: "",
          driverId: "",
        },
      ],
    },
  ],
  notes: "",
  status: "Assigned",
});

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeLead = (lead) => ({
  id: Number(lead.id || 0),
  bookingRef: lead.booking_ref || lead.bookingRef || "-",
  clientCompany: lead.client_company || lead.clientCompany || "-",
  agentContact: lead.agent_contact || lead.agentContact || "-",
  clientCountry: lead.client_country || lead.clientCountry || "-",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
  routeParks: lead.route_parks || lead.routeParks || "-",
  noOfVehicles: Number(lead.no_of_vehicles ?? lead.noOfVehicles ?? 0),
  paxAdults: Number(lead.pax_adults ?? lead.paxAdults ?? 0),
  paxChildren: Number(lead.pax_children ?? lead.paxChildren ?? 0),
  bookingStatus: lead.booking_status || lead.bookingStatus || "Pending",
  piSentAt: lead.pi_sent_at || lead.piSentAt || "",
});

const formatPiNumberFromId = (id, dateValue) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return "";

  const parsed = new Date(dateValue || Date.now());
  const yearMonth = Number.isNaN(parsed.getTime())
    ? `${String(new Date().getFullYear())}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    : `${String(parsed.getFullYear())}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;

  return `PI-${yearMonth}-${String(Math.trunc(numericId)).padStart(3, "0")}`;
};

const normalizePI = (pi) => ({
  id: Number(pi.id || 0),
  leadId: Number(pi.lead_id || pi.leadId || 0),
  piNo:
    pi.pi_no ||
    pi.piNo ||
    pi.proforma_number ||
    pi.proformaNumber ||
    pi.invoice_no ||
    pi.invoiceNo ||
    formatPiNumberFromId(
      pi.id,
      pi.quote_date || pi.quoteDate || pi.created_at || pi.createdAt,
    ),
  groupName: pi.group_name || pi.groupName || "",
  date:
    pi.quoteDate ||
    pi.quote_date ||
    pi.invoice_date ||
    pi.invoiceDate ||
    pi.created_at ||
    pi.createdAt ||
    "",
  status: pi.status || "Converted",
});

const normalizeQuotation = (quotation) => ({
  id: Number(quotation.id || 0),
  leadId: Number(quotation.lead_id || quotation.leadId || 0),
  groupName: quotation.group_name || quotation.groupName || "",
  quoteDate:
    quotation.quoteDate ||
    quotation.quote_date ||
    quotation.date ||
    quotation.created_at ||
    quotation.createdAt ||
    "",
});

const normalizeVehicle = (vehicle) => ({
  id: Number(vehicle.id || 0),
  vehicleNo: vehicle.vehicle_no || vehicle.vehicleNo || "",
  plateNo: vehicle.plate_no || vehicle.plateNo || "",
  make: vehicle.make || "",
  model: vehicle.model || "",
  status: vehicle.status || "Available",
  leaseType: vehicle.lease_type || vehicle.leaseType || "",
  leaseStartDate: vehicle.lease_start_date || vehicle.leaseStartDate || "",
  leaseEndDate: vehicle.lease_end_date || vehicle.leaseEndDate || "",
  leaseClientName: vehicle.lease_client_name || vehicle.leaseClientName || "",
  assignedDriverId:
    vehicle.assigned_driver_id ||
    vehicle.assignedDriverId ||
    vehicle.assigned_driver?.id ||
    vehicle.assignedDriver?.id ||
    "",
  assignedDriverName:
    vehicle.assigned_driver?.name || vehicle.assignedDriver?.name || "",
});

const normalizeLeaseContract = (contract) => {
  const vehicleIds = Array.isArray(contract.vehicleIds)
    ? contract.vehicleIds.map(Number)
    : Array.isArray(contract.vehicles)
      ? contract.vehicles.map((vehicle) => Number(vehicle.id))
      : contract.vehicleId
        ? [Number(contract.vehicleId)]
        : [];

  return {
    id: Number(contract.id || 0),
    vehicleIds,
    leaseType: contract.leaseType || contract.lease_type || "",
    startDate: contract.startDate || contract.start_date || "",
    endDate: contract.endDate || contract.end_date || "",
    status: contract.status || "Active",
  };
};

const normalizeUser = (user) => ({
  id: Number(user.id || 0),
  name: user.name || "",
  role: user.role || "Viewer",
  status:
    typeof user.status === "string"
      ? user.status
      : user.status === 1 || user.status === true
        ? "Active"
        : "Inactive",
});

const normalizeAssignedVehicleDriver = (vehicle) => {
  const assignedDriver = vehicle?.assigned_driver || vehicle?.assignedDriver;
  const assignedDriverId =
    vehicle?.assigned_driver_id ||
    vehicle?.assignedDriverId ||
    assignedDriver?.id;

  if (!assignedDriverId) return null;

  return {
    id: Number(assignedDriverId),
    name:
      assignedDriver?.name || vehicle?.assignedDriverName || "Assigned driver",
    role: assignedDriver?.role || "Driver",
    status: "Active",
  };
};

const normalizeAllocation = (allocation) => ({
  id:
    allocation.id ||
    `${
      allocation.leadId || allocation.lead_id
    }-${allocation.vehicleId || allocation.vehicle_id}-${
      allocation.driverId || allocation.driver_id
    }`,
  leadId: String(allocation.leadId || allocation.lead_id || ""),
  piId: String(
    allocation.piId ||
      allocation.proformaInvoiceId ||
      allocation.proforma_invoice_id ||
      "",
  ),
  vehicleId: String(allocation.vehicleId || allocation.vehicle_id || ""),
  driverId: String(allocation.driverId || allocation.driver_id || ""),
  vehicleLeaseType:
    allocation.vehicleLeaseType ||
    allocation.vehicle_lease_type ||
    DEFAULT_VEHICLE_LEASE_TYPE,
  startDate:
    allocation.startDate ||
    allocation.start_date ||
    allocation.allocationStartDate ||
    "",
  endDate:
    allocation.endDate ||
    allocation.end_date ||
    allocation.allocationEndDate ||
    "",
  notes: allocation.notes || "",
  status: allocation.status || "Assigned",
  lead: allocation.lead
    ? {
        id: Number(allocation.lead.id || 0),
        bookingRef:
          allocation.lead.booking_ref || allocation.lead.bookingRef || "-",
        clientCompany:
          allocation.lead.client_company ||
          allocation.lead.clientCompany ||
          "-",
        agentContact:
          allocation.lead.agent_contact || allocation.lead.agentContact || "-",
        startDate:
          allocation.lead.start_date || allocation.lead.startDate || "",
        endDate: allocation.lead.end_date || allocation.lead.endDate || "",
        routeParks:
          allocation.lead.route_parks || allocation.lead.routeParks || "-",
      }
    : null,
  proformaInvoice: allocation.proformaInvoice
    ? {
        id: Number(allocation.proformaInvoice.id || 0),
        piNo:
          allocation.proformaInvoice.pi_no ||
          allocation.proformaInvoice.piNo ||
          allocation.proformaInvoice.proforma_number ||
          allocation.proformaInvoice.proformaNumber ||
          formatPiNumberFromId(
            allocation.proformaInvoice.id,
            allocation.proformaInvoice.quote_date ||
              allocation.proformaInvoice.quoteDate ||
              allocation.proformaInvoice.created_at ||
              allocation.proformaInvoice.createdAt,
          ),
      }
    : null,
  vehicle: allocation.vehicle
    ? {
        id: Number(allocation.vehicle.id || 0),
        vehicleNo:
          allocation.vehicle.vehicle_no || allocation.vehicle.vehicleNo || "",
        plateNo:
          allocation.vehicle.plate_no || allocation.vehicle.plateNo || "",
        make: allocation.vehicle.make || "",
        model: allocation.vehicle.model || "",
      }
    : null,
  driver: allocation.driver
    ? {
        id: Number(allocation.driver.id || 0),
        name: allocation.driver.name || "",
      }
    : null,
  createdAt:
    allocation.createdAt || allocation.created_at || new Date().toISOString(),
  updatedAt:
    allocation.updatedAt ||
    allocation.updated_at ||
    allocation.createdAt ||
    allocation.created_at ||
    new Date().toISOString(),
});

const extractAllocation = (payload) => {
  if (payload?.allocation) return payload.allocation;
  if (payload?.data) return payload.data;
  return payload;
};

const extractList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
};

const createEmptyPair = () => ({
  vehicleLeaseType: DEFAULT_VEHICLE_LEASE_TYPE,
  vehicleId: "",
  driverId: "",
});
const createEmptyRange = () => ({
  startDate: "",
  endDate: "",
  pairs: [createEmptyPair()],
});

const isLeaseVehicle = (vehicle) =>
  String(vehicle.status || "").toLowerCase() === "on lease";

const getLeaseDays = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  const leaseStart = new Date(startDate);
  const leaseEnd = new Date(endDate);
  if (Number.isNaN(leaseStart.getTime()) || Number.isNaN(leaseEnd.getTime())) {
    return null;
  }

  return Math.abs(leaseEnd - leaseStart) / (1000 * 60 * 60 * 24);
};

const getVehicleLeaseType = (vehicle) => {
  if (!isLeaseVehicle(vehicle)) return DEFAULT_VEHICLE_LEASE_TYPE;
  if (vehicle.leaseType === "Long-Term Lease") return "Long-Term Lease";

  if (!vehicle.leaseStartDate || !vehicle.leaseEndDate) {
    return vehicle.leaseType === "Short-Term Lease"
      ? "Short-Term Lease"
      : DEFAULT_VEHICLE_LEASE_TYPE;
  }

  const leaseDays = getLeaseDays(vehicle.leaseStartDate, vehicle.leaseEndDate);
  if (leaseDays === null) {
    return DEFAULT_VEHICLE_LEASE_TYPE;
  }

  return leaseDays > 365 ? "Long-Term Lease" : "Short-Term Lease";
};

const isVehicleAvailableForSafariRange = (vehicle, startDate, endDate) => {
  if (vehicle.status === "Available") return true;
  if (!isLeaseVehicle(vehicle)) return false;

  if (
    !vehicle.leaseStartDate ||
    !vehicle.leaseEndDate ||
    !startDate ||
    !endDate
  ) {
    return true;
  }

  return vehicle.leaseStartDate <= startDate && vehicle.leaseEndDate >= endDate;
};

export default function SafariAllocations() {
  const [leads, setLeads] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [leaseContracts, setLeaseContracts] = useState([]);
  const [users, setUsers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportRangeStart, setReportRangeStart] = useState("");
  const [reportRangeEnd, setReportRangeEnd] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createFormState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const [
        leadsRes,
        proformasRes,
        quotationsRes,
        vehiclesRes,
        leaseContractsRes,
        usersRes,
        allocationsRes,
      ] = await Promise.all([
        apiFetch("/leads"),
        apiFetch("/proforma-invoices"),
        apiFetch("/quotations"),
        apiFetch("/vehicles"),
        apiFetch("/lease-contracts"),
        apiFetch("/users"),
        apiFetch("/safari-allocations"),
      ]);

      const [
        leadsPayload,
        proformasPayload,
        quotationsPayload,
        vehiclesPayload,
        leaseContractsPayload,
        usersPayload,
        allocationsPayload,
      ] = await Promise.all([
        leadsRes.json().catch(() => ({})),
        proformasRes.json().catch(() => ({})),
        quotationsRes.json().catch(() => ({})),
        vehiclesRes.json().catch(() => ({})),
        leaseContractsRes.json().catch(() => ({})),
        usersRes.json().catch(() => ({})),
        allocationsRes.json().catch(() => ({})),
      ]);

      if (!leadsRes.ok) {
        throw new Error(leadsPayload?.message || "Unable to fetch leads.");
      }
      if (!proformasRes.ok) {
        throw new Error(
          proformasPayload?.message || "Unable to fetch proforma invoices.",
        );
      }
      if (!quotationsRes.ok) {
        throw new Error(
          quotationsPayload?.message || "Unable to fetch quotations.",
        );
      }
      if (!vehiclesRes.ok) {
        throw new Error(
          vehiclesPayload?.message || "Unable to fetch vehicles.",
        );
      }
      if (!leaseContractsRes.ok) {
        throw new Error(
          leaseContractsPayload?.message || "Unable to fetch lease contracts.",
        );
      }
      if (!usersRes.ok) {
        throw new Error(usersPayload?.message || "Unable to fetch users.");
      }
      if (!allocationsRes.ok) {
        throw new Error(
          allocationsPayload?.message || "Unable to fetch safari allocations.",
        );
      }

      setLeads(extractList(leadsPayload, "leads").map(normalizeLead));
      setProformas(
        extractList(proformasPayload, "proformaInvoices").map(normalizePI),
      );
      setQuotations(
        extractList(quotationsPayload, "quotations").map(normalizeQuotation),
      );
      setVehicles(
        extractList(vehiclesPayload, "vehicles").map(normalizeVehicle),
      );
      setLeaseContracts(
        extractList(leaseContractsPayload, "contracts").map(
          normalizeLeaseContract,
        ),
      );
      setUsers(extractList(usersPayload, "users").map(normalizeUser));
      setAllocations(
        extractList(allocationsPayload, [
          "safariAllocations",
          "safari_allocations",
          "allocations",
        ]).map(normalizeAllocation),
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to load safari allocations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const groupNameByLead = useMemo(() => {
    const latestByLead = new Map();

    quotations.forEach((quotation) => {
      if (!quotation.leadId || !quotation.groupName) return;

      const key = String(quotation.leadId);
      const existing = latestByLead.get(key);
      if (!existing) {
        latestByLead.set(key, quotation);
        return;
      }

      const currentTime = new Date(quotation.quoteDate || 0).getTime();
      const existingTime = new Date(existing.quoteDate || 0).getTime();
      if (currentTime >= existingTime) {
        latestByLead.set(key, quotation);
      }
    });

    const map = new Map();
    latestByLead.forEach((quotation, leadId) => {
      map.set(leadId, quotation.groupName);
    });
    return map;
  }, [quotations]);

  const safariOptions = useMemo(() => {
    // Include 'Allocated' so existing allocations can still resolve their
    // safari (client/group name) when editing. createSafariOptions filters
    // already-allocated leads out for the create flow.
    const allocatablePIs = proformas.filter((pi) =>
      ["Confirmed", "Partially Allocated", "Allocated"].includes(pi.status),
    );

    const latestProformaByLead = new Map();
    allocatablePIs.forEach((pi) => {
      if (!pi.leadId) return;
      const existing = latestProformaByLead.get(String(pi.leadId));
      if (!existing) {
        latestProformaByLead.set(String(pi.leadId), pi);
        return;
      }
      const currentTime = new Date(pi.date || 0).getTime();
      const existingTime = new Date(existing.date || 0).getTime();
      if (currentTime >= existingTime) {
        latestProformaByLead.set(String(pi.leadId), pi);
      }
    });

    return leads
      .filter((lead) => latestProformaByLead.has(String(lead.id)))
      .map((lead) => {
        const pi = latestProformaByLead.get(String(lead.id));
        return {
          leadId: String(lead.id),
          piId: String(pi?.id || ""),
          piNo: pi?.piNo || "-",
          bookingRef: lead.bookingRef,
          clientCompany: lead.clientCompany,
          groupName:
            groupNameByLead.get(String(lead.id)) || pi?.groupName || "-",
          agentContact: lead.agentContact,
          routeParks: lead.routeParks,
          startDate: lead.startDate,
          endDate: lead.endDate,
          noOfVehicles: Number(lead.noOfVehicles || 0),
          pax: Number(lead.paxAdults || 0) + Number(lead.paxChildren || 0),
          nationality: lead.clientCountry,
        };
      });
  }, [leads, proformas, groupNameByLead]);

  const allocatedLeadIds = useMemo(() => {
    return new Set(
      allocations
        .map((allocation) => String(allocation.leadId || ""))
        .filter(Boolean),
    );
  }, [allocations]);

  const createSafariOptions = useMemo(
    () =>
      safariOptions.filter(
        (safari) => !allocatedLeadIds.has(String(safari.leadId)),
      ),
    [safariOptions, allocatedLeadIds],
  );

  useEffect(() => {
    if (safariOptions.length === 0) {
      return;
    }

    if (reportRangeStart && reportRangeEnd) {
      return;
    }

    const starts = safariOptions
      .map((item) => item.startDate)
      .filter(Boolean)
      .sort();
    const ends = safariOptions
      .map((item) => item.endDate)
      .filter(Boolean)
      .sort();

    if (!reportRangeStart && starts.length > 0) {
      setReportRangeStart(starts[0]);
    }

    if (!reportRangeEnd && ends.length > 0) {
      setReportRangeEnd(ends[ends.length - 1]);
    }
  }, [safariOptions, reportRangeStart, reportRangeEnd]);

  const driverOptions = useMemo(() => {
    const activeUsers = users.filter(
      (user) => String(user.status).toLowerCase() === "active",
    );
    const opsUsers = activeUsers.filter((user) =>
      String(user.role).toLowerCase().includes("operations"),
    );
    return opsUsers.length > 0 ? opsUsers : activeUsers;
  }, [users]);

  const assignedDriverOptions = useMemo(() => {
    const assignedDrivers = vehicles
      .map(normalizeAssignedVehicleDriver)
      .filter(Boolean);
    const uniqueDrivers = new Map();

    [...users, ...assignedDrivers].forEach((driver) => {
      if (!driver?.id) return;
      uniqueDrivers.set(String(driver.id), driver);
    });

    return Array.from(uniqueDrivers.values());
  }, [users, vehicles]);

  const getAssignedDriverForVehicle = (vehicle) => {
    if (!vehicle?.assignedDriverId) return null;

    return assignedDriverOptions.find(
      (driver) => String(driver.id) === String(vehicle.assignedDriverId),
    );
  };

  const mergeDriverOptions = (options, extraDriver) => {
    if (!extraDriver?.id) return options;
    if (
      options.some((driver) => String(driver.id) === String(extraDriver.id))
    ) {
      return options;
    }

    return [...options, extraDriver];
  };

  const resolvedAllocations = useMemo(() => {
    return allocations.map((allocation) => {
      const safari = safariOptions.find(
        (item) => item.leadId === String(allocation.leadId),
      );
      const vehicle = vehicles.find(
        (item) => String(item.id) === String(allocation.vehicleId),
      );
      const driver =
        driverOptions.find(
          (item) => String(item.id) === String(allocation.driverId),
        ) ||
        assignedDriverOptions.find(
          (item) => String(item.id) === String(allocation.driverId),
        );
      return {
        ...allocation,
        safari:
          safari ||
          (allocation.lead
            ? {
                leadId: String(allocation.lead.id || allocation.leadId || ""),
                piId: String(
                  allocation.proformaInvoice?.id || allocation.piId || "",
                ),
                piNo: allocation.proformaInvoice?.piNo || "-",
                bookingRef: allocation.lead.bookingRef || "-",
                clientCompany: allocation.lead.clientCompany || "-",
                groupName:
                  groupNameByLead.get(
                    String(allocation.lead.id || allocation.leadId || ""),
                  ) ||
                  allocation.lead.group_name ||
                  allocation.lead.groupName ||
                  "-",
                agentContact: allocation.lead.agentContact || "-",
                routeParks: allocation.lead.routeParks || "-",
                startDate: allocation.lead.startDate || "",
                endDate: allocation.lead.endDate || "",
                pax: 0,
                nationality: "-",
              }
            : null),
        vehicle: vehicle || allocation.vehicle || null,
        driver: driver || allocation.driver || null,
      };
    });
  }, [
    allocations,
    safariOptions,
    vehicles,
    driverOptions,
    assignedDriverOptions,
    groupNameByLead,
  ]);

  const filteredAllocations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return resolvedAllocations;
    return resolvedAllocations.filter((allocation) => {
      return (
        String(allocation.safari?.bookingRef || "")
          .toLowerCase()
          .includes(query) ||
        String(allocation.safari?.clientCompany || "")
          .toLowerCase()
          .includes(query) ||
        String(allocation.safari?.groupName || "")
          .toLowerCase()
          .includes(query) ||
        String(
          allocation.vehicle?.vehicleNo || allocation.vehicle?.plateNo || "",
        )
          .toLowerCase()
          .includes(query) ||
        String(allocation.driver?.name || "")
          .toLowerCase()
          .includes(query) ||
        String(allocation.safari?.piNo || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [resolvedAllocations, searchTerm]);

  const activeLeaseContractVehicleIds = useMemo(() => {
    const ids = new Set();

    leaseContracts
      .filter((contract) => contract.status === "Active")
      .forEach((contract) => {
        contract.vehicleIds.forEach((vehicleId) => ids.add(String(vehicleId)));
      });

    return ids;
  }, [leaseContracts]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.status === "Available" ||
          activeLeaseContractVehicleIds.has(String(vehicle.id)),
      ),
    [vehicles, activeLeaseContractVehicleIds],
  );

  const availableDrivers = useMemo(() => driverOptions, [driverOptions]);

  const getVehicleLabel = (allocation) => {
    if (!allocation.vehicle) return "-";

    const vehicleNumber =
      allocation.vehicle.vehicleNo || allocation.vehicle.plateNo || "";
    const vehicleMake = allocation.vehicle.make
      ? "- " + allocation.vehicle.make
      : "";

    return [vehicleNumber, vehicleMake].filter(Boolean).join(" ") || "-";
  };

  const getVehicleOptionLabel = (vehicle) => {
    const baseLabel =
      (vehicle.vehicleNo || "Vehicle") +
      " | Reg: " +
      (vehicle.plateNo || "N/A");
    const resolvedLeaseType = activeLeaseContractVehicleIds.has(
      String(vehicle.id),
    )
      ? "Long-Term Lease"
      : getVehicleLeaseType(vehicle);
    const leaseLabel = isLeaseVehicle(vehicle)
      ? " | " +
        resolvedLeaseType +
        (vehicle.leaseClientName ? ": " + vehicle.leaseClientName : "")
      : "";
    const driverLabel = vehicle.assignedDriverName
      ? " | Driver: " + vehicle.assignedDriverName
      : "";
    const makeLabel = vehicle.make
      ? " - " + vehicle.make + " " + (vehicle.model || "")
      : "";

    return baseLabel + leaseLabel + driverLabel + makeLabel;
  };

  const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    return aStart <= bEnd && aEnd >= bStart;
  };

  const stats = useMemo(() => {
    const hasValidRange =
      Boolean(reportRangeStart) &&
      Boolean(reportRangeEnd) &&
      reportRangeStart <= reportRangeEnd;

    if (!hasValidRange) {
      return {
        hasValidRange,
        safarisInRange: 0,
        plannedSlots: 0,
        allocatedSlots: 0,
        pendingSlots: 0,
        coveragePercent: 0,
        availableVehicles: vehicleOptions.length,
      };
    }

    const safarisInRange = safariOptions.filter((item) =>
      rangesOverlap(
        item.startDate,
        item.endDate,
        reportRangeStart,
        reportRangeEnd,
      ),
    );

    const plannedSlots = safarisInRange.reduce(
      (total, item) => total + Math.max(Number(item.noOfVehicles || 0), 0),
      0,
    );

    const allocatedSlots = resolvedAllocations.filter((item) => {
      const allocationStart = item.startDate || item.safari?.startDate;
      const allocationEnd = item.endDate || item.safari?.endDate;

      return rangesOverlap(
        allocationStart,
        allocationEnd,
        reportRangeStart,
        reportRangeEnd,
      );
    }).length;

    const pendingSlots = Math.max(plannedSlots - allocatedSlots, 0);
    const coveragePercent =
      plannedSlots > 0
        ? Math.min(Math.round((allocatedSlots / plannedSlots) * 100), 100)
        : 0;

    return {
      hasValidRange,
      safarisInRange: safarisInRange.length,
      plannedSlots,
      allocatedSlots,
      pendingSlots,
      coveragePercent,
      availableVehicles: vehicleOptions.length,
    };
  }, [
    reportRangeStart,
    reportRangeEnd,
    safariOptions,
    resolvedAllocations,
    vehicleOptions.length,
  ]);

  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const addRange = () =>
    setForm((current) => ({
      ...current,
      ranges: [...current.ranges, createEmptyRange()],
    }));

  const removeRange = (rangeIdx) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.filter((_, index) => index !== rangeIdx),
    }));

  const updateRangeField = (rangeIdx, field, value) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx ? { ...range, [field]: value } : range,
      ),
    }));

  const addPairToRange = (rangeIdx) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) =>
        index === rangeIdx
          ? { ...range, pairs: [...range.pairs, createEmptyPair()] }
          : range,
      ),
    }));

  const removePairFromRange = (rangeIdx, pairIdx) =>
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) => {
        if (index !== rangeIdx) return range;
        return {
          ...range,
          pairs: range.pairs.filter((_, rowIndex) => rowIndex !== pairIdx),
        };
      }),
    }));

  const handleVehicleChange = (rangeIdx, pairIdx, vehicleId) => {
    const matchedVehicle = vehicles.find(
      (vehicle) => String(vehicle.id) === String(vehicleId),
    );
    const assignedDriver = getAssignedDriverForVehicle(matchedVehicle);
    const assignedDriverId = assignedDriver ? String(assignedDriver.id) : "";
    const vehicleLeaseType = activeLeaseContractVehicleIds.has(
      String(vehicleId),
    )
      ? "Long-Term Lease"
      : DEFAULT_VEHICLE_LEASE_TYPE;

    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) => {
        if (index !== rangeIdx) return range;
        return {
          ...range,
          pairs: range.pairs.map((pair, rowIndex) => {
            if (rowIndex !== pairIdx) return pair;
            return {
              ...pair,
              vehicleLeaseType,
              vehicleId,
              driverId: assignedDriverId || "",
            };
          }),
        };
      }),
    }));
  };

  const handleVehicleLeaseTypeChange = (
    rangeIdx,
    pairIdx,
    vehicleLeaseType,
  ) => {
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) => {
        if (index !== rangeIdx) return range;
        return {
          ...range,
          pairs: range.pairs.map((pair, rowIndex) => {
            if (rowIndex !== pairIdx) return pair;
            return {
              ...pair,
              vehicleLeaseType,
              vehicleId: "",
              driverId: "",
            };
          }),
        };
      }),
    }));
  };

  const handleDriverChange = (rangeIdx, pairIdx, driverId) => {
    setForm((current) => ({
      ...current,
      ranges: current.ranges.map((range, index) => {
        if (index !== rangeIdx) return range;
        return {
          ...range,
          pairs: range.pairs.map((pair, rowIndex) => {
            if (rowIndex !== pairIdx) return pair;

            const selectedVehicle = vehicles.find(
              (vehicle) => String(vehicle.id) === String(pair.vehicleId),
            );
            const vehicleAssignedDriverId = selectedVehicle?.assignedDriverId
              ? String(selectedVehicle.assignedDriverId)
              : "";

            return {
              ...pair,
              driverId,
              vehicleId:
                vehicleAssignedDriverId &&
                vehicleAssignedDriverId !== String(driverId || "")
                  ? ""
                  : pair.vehicleId,
            };
          }),
        };
      }),
    }));
  };

  const getVehiclesForRow = (rangeIdx, pairIdx) => {
    const currentRange = form.ranges[rangeIdx] || createEmptyRange();
    const otherSelected = new Set(
      currentRange.pairs
        .filter((_, i) => i !== pairIdx)
        .map((p) => p.vehicleId)
        .filter(Boolean),
    );
    const selectedDriverId = String(
      currentRange.pairs[pairIdx]?.driverId || "",
    );
    const selectedVehicleLeaseType =
      currentRange.pairs[pairIdx]?.vehicleLeaseType ||
      DEFAULT_VEHICLE_LEASE_TYPE;
    const current = currentRange.pairs[pairIdx]?.vehicleId || "";
    return vehicles.filter((v) => {
      const isCurrent = String(v.id) === current;
      if (isCurrent) return true;
      if (otherSelected.has(String(v.id))) return false;
      if (selectedVehicleLeaseType === "Long-Term Lease") {
        if (!activeLeaseContractVehicleIds.has(String(v.id))) return false;
        return selectedDriverId
          ? !v.assignedDriverId ||
              String(v.assignedDriverId) === selectedDriverId
          : true;
      }

      if (v.status !== "Available") return false;

      return selectedDriverId
        ? String(v.assignedDriverId || "") === selectedDriverId
        : Boolean(v.assignedDriverId);
    });
  };

  const getDriversForRow = (rangeIdx, pairIdx) => {
    const currentRange = form.ranges[rangeIdx] || createEmptyRange();
    const otherSelected = new Set(
      currentRange.pairs
        .filter((_, i) => i !== pairIdx)
        .map((p) => p.driverId)
        .filter(Boolean),
    );
    const selectedVehicle = vehicles.find(
      (vehicle) =>
        String(vehicle.id) ===
        String(currentRange.pairs[pairIdx]?.vehicleId || ""),
    );
    const assignedDriver = getAssignedDriverForVehicle(selectedVehicle);
    const vehicleAssignedDriverId = selectedVehicle?.assignedDriverId
      ? String(selectedVehicle.assignedDriverId)
      : "";
    const current = currentRange.pairs[pairIdx]?.driverId || "";
    return mergeDriverOptions(driverOptions, assignedDriver).filter(
      (d) =>
        ((vehicleAssignedDriverId
          ? String(d.id) === vehicleAssignedDriverId
          : true) &&
          !otherSelected.has(String(d.id))) ||
        String(d.id) === current,
    );
  };

  const selectedSafariOption = useMemo(
    () =>
      safariOptions.find((item) => String(item.leadId) === String(form.leadId)),
    [safariOptions, form.leadId],
  );

  const totalRowsInForm = useMemo(
    () => form.ranges.reduce((sum, range) => sum + range.pairs.length, 0),
    [form.ranges],
  );

  const handleLeadChange = (leadId) => {
    const safari = safariOptions.find(
      (item) => String(item.leadId) === String(leadId),
    );

    setForm((current) => {
      const nextRanges = current.ranges.length
        ? current.ranges.map((range, index) => {
            if (index !== 0) return range;

            return {
              ...range,
              startDate: safari?.startDate || "",
              endDate: safari?.endDate || "",
            };
          })
        : [
            {
              ...createEmptyRange(),
              startDate: safari?.startDate || "",
              endDate: safari?.endDate || "",
            },
          ];

      return {
        ...current,
        leadId,
        ranges: nextRanges,
      };
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setErrorMessage("");
    setForm(createFormState());
    setIsModalOpen(true);
  };

  const openEdit = (allocation) => {
    setEditingId(allocation.id);
    setErrorMessage("");
    setForm({
      leadId: String(allocation.leadId || ""),
      ranges: [
        {
          startDate: String(allocation.startDate || ""),
          endDate: String(allocation.endDate || ""),
          pairs: [
            {
              vehicleId: String(allocation.vehicleId || ""),
              driverId: String(allocation.driverId || ""),
              vehicleLeaseType:
                allocation.vehicleLeaseType || DEFAULT_VEHICLE_LEASE_TYPE,
            },
          ],
        },
      ],
      notes: allocation.notes || "",
      status: allocation.status || "Assigned",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (allocationId) => {
    const confirmation = await Swal.fire({
      title: "Delete allocation?",
      text: "Vehicle and driver assignment will be removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await apiFetch(`/safari-allocations/${allocationId}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete safari allocation.",
        );
      }

      const next = allocations.filter((item) => item.id !== allocationId);
      setAllocations(next);

      await Swal.fire({
        title: "Deleted",
        text: "Safari allocation deleted successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete safari allocation.");
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to delete safari allocation.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.leadId) {
      setErrorMessage("Please select a safari.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please select a safari before saving.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (form.ranges.length === 0) {
      setErrorMessage("Please add at least one date range.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please add at least one date range.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    const invalidRange = form.ranges.find(
      (range) =>
        !range.startDate ||
        !range.endDate ||
        range.startDate > range.endDate ||
        range.pairs.length === 0 ||
        range.pairs.some((pair) => !pair.vehicleId || !pair.driverId),
    );

    if (invalidRange) {
      setErrorMessage(
        "Each date range must have valid From/To dates and fully selected vehicle/driver rows.",
      );
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Each date range must have valid From/To dates and fully selected vehicle/driver rows.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    const selectedLeadId = String(form.leadId || "");
    try {
      const safari = safariOptions.find(
        (item) => item.leadId === selectedLeadId,
      );

      const buildPayload = (pair, startDate, endDate) => ({
        leadId: Number(form.leadId),
        proformaInvoiceId: safari?.piId ? Number(safari.piId) : null,
        vehicleId: Number(pair.vehicleId),
        driverId: Number(pair.driverId),
        vehicleLeaseType: pair.vehicleLeaseType || DEFAULT_VEHICLE_LEASE_TYPE,
        startDate,
        endDate,
        notes: form.notes,
        status: form.status,
      });

      const totalRows = form.ranges.reduce(
        (sum, range) => sum + range.pairs.length,
        0,
      );

      if (editingId) {
        const firstRange = form.ranges[0] || createEmptyRange();
        const pair = firstRange.pairs[0] || createEmptyPair();

        const payload = buildPayload(
          pair,
          firstRange.startDate,
          firstRange.endDate,
        );

        const response = await apiFetch(`/safari-allocations/${editingId}`, {
          method: "PUT",
          body: payload,
        });

        const responsePayload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            responsePayload?.message || "Unable to update safari allocation.",
          );
        }

        const updatedAllocation = normalizeAllocation(
          extractAllocation(responsePayload),
        );

        setAllocations(
          allocations.map((item) =>
            item.id === editingId ? updatedAllocation : item,
          ),
        );
        setIsModalOpen(false);
        setEditingId(null);
        setForm(createFormState());
      } else {
        const created = [];

        for (const range of form.ranges) {
          for (const pair of range.pairs) {
            const response = await apiFetch("/safari-allocations", {
              method: "POST",
              body: buildPayload(pair, range.startDate, range.endDate),
            });

            const responsePayload = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(
                responsePayload?.message ||
                  "Unable to create safari allocation.",
              );
            }

            created.push(
              normalizeAllocation(extractAllocation(responsePayload)),
            );
          }
        }

        setAllocations([...created.reverse(), ...allocations]);
        setForm({
          ...createFormState(),
          leadId: selectedLeadId,
        });
      }

      await Swal.fire({
        title: editingId ? "Updated" : "Created",
        text: editingId
          ? "Safari allocation updated successfully."
          : `${totalRows} allocation${totalRows > 1 ? "s" : ""} created successfully.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save safari allocation.");
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to save safari allocation.",
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
          <h1 className="text-2xl font-bold text-slate-900">
            Safari Allocations
          </h1>
          <p className="text-slate-500 mt-1">
            Allocate multiple vehicles and drivers to safari bookings with
            proforma invoices.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New Allocation
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Card Report Range
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Summary cards below are calculated only for this date range.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:max-w-lg lg:ml-auto">
            <label className="text-xs font-medium text-slate-600">
              From
              <input
                type="date"
                value={reportRangeStart}
                onChange={(event) => setReportRangeStart(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              To
              <input
                type="date"
                value={reportRangeEnd}
                onChange={(event) => setReportRangeEnd(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
              />
            </label>
          </div>
        </div>

        {!stats.hasValidRange && (
          <p className="mt-3 text-xs text-rose-600">
            Select a valid From/To range to view meaningful allocation report
            cards.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Safaris In Range
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.safarisInRange}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            With PI and selected dates
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Planned Vehicle Slots
          </p>
          <p className="text-2xl font-bold text-sky-700 mt-1">
            {stats.plannedSlots}
          </p>
          <p className="mt-1 text-xs text-sky-700/80">
            Sum of required vehicles in range
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Allocated Slots
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {stats.allocatedSlots}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">
            Allocation rows in selected range
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Unallocated Slots
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {stats.pendingSlots}
          </p>
          <p className="mt-1 text-xs text-amber-700/80">
            Coverage {stats.coveragePercent}% for range
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Selectable Vehicles
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {stats.availableVehicles}
          </p>
          <p className="mt-1 text-xs text-blue-700/80">
            Available vehicles plus active lease vehicles
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active Report Window
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {reportRangeStart ? formatDate(reportRangeStart) : "-"} to{" "}
            {reportRangeEnd ? formatDate(reportRangeEnd) : "-"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            These cards are date-range based to avoid ambiguous pending totals.
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
            placeholder="Search by safari, group name, PI, vehicle, or driver"
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="table-head-gradient text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3">Safari</th>
                <th className="px-4 py-3">Group Name</th>
                <th className="px-4 py-3">PI</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Loading safari allocations...
                  </td>
                </tr>
              ) : filteredAllocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    No safari allocations yet.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((allocation) => (
                  <tr
                    key={allocation.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(allocation)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(allocation.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-700">
                          <ClipboardList className="w-3.5 h-3.5" />
                          {allocation.safari?.bookingRef || "Unknown Safari"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {allocation.safari?.clientCompany || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {allocation.safari?.groupName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {allocation.safari?.piNo || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-xs">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <span>{allocation.safari?.routeParks || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <div>
                            {formatDate(
                              allocation.startDate ||
                                allocation.safari?.startDate,
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            to{" "}
                            {formatDate(
                              allocation.endDate || allocation.safari?.endDate,
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-slate-400" />
                        {getVehicleLabel(allocation)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        {allocation.driver?.name || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">
                        <Users className="w-3 h-3" />
                        {allocation.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && createSafariOptions.length === 0 && (
          <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No eligible safaris found for new allocation. A safari must have a
            proforma invoice and must not already be allocated.
          </div>
        )}
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
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {editingId
                  ? "Edit Safari Allocation"
                  : "Create Safari Allocation"}
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

            <div className="p-6 space-y-5">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Safari *
                  </label>
                  <select
                    value={form.leadId}
                    onChange={(event) => handleLeadChange(event.target.value)}
                    disabled={isSaving || Boolean(editingId)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select safari</option>
                    {(editingId ? safariOptions : createSafariOptions).map(
                      (safari) => (
                        <option key={safari.leadId} value={safari.leadId}>
                          Group: {safari.groupName || "-"} | {safari.bookingRef}{" "}
                          | {safari.clientCompany} | {safari.piNo}
                        </option>
                      ),
                    )}
                  </select>
                  {form.leadId && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                      <div>
                        <span className="font-medium text-amber-300">
                          Client:{" "}
                        </span>
                        <span className="font-semibold text-white">
                          {selectedSafariOption?.clientCompany || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-amber-300">
                          Group Name:{" "}
                        </span>
                        <span className="font-semibold text-white">
                          {selectedSafariOption?.groupName || "-"}
                        </span>
                      </div>
                    </div>
                  )}
                  {!editingId && (
                    <p className="text-xs text-slate-500 mt-1">
                      Add multiple rows below to allocate several
                      vehicles/drivers in one save.
                    </p>
                  )}
                  {editingId && (
                    <p className="text-xs text-slate-500 mt-1">
                      Safari cannot be changed while editing this allocation.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-300">
                      Date Ranges With Vehicle Allocation
                    </label>
                    {!editingId && (
                      <button
                        type="button"
                        onClick={addRange}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        Add Date Range
                      </button>
                    )}
                  </div>

                  {form.ranges.map((range, rangeIdx) => (
                    <div
                      key={rangeIdx}
                      className="space-y-4 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-300">
                          Range {rangeIdx + 1}
                        </p>
                        {!editingId && form.ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRange(rangeIdx)}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-900/40 text-white hover:bg-rose-900/60 disabled:opacity-50"
                          >
                            Remove Range
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            From Date
                          </label>
                          <input
                            type="date"
                            value={range.startDate}
                            onChange={(event) =>
                              updateRangeField(
                                rangeIdx,
                                "startDate",
                                event.target.value,
                              )
                            }
                            disabled={isSaving}
                            min={selectedSafariOption?.startDate || undefined}
                            max={selectedSafariOption?.endDate || undefined}
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            To Date
                          </label>
                          <input
                            type="date"
                            value={range.endDate}
                            onChange={(event) =>
                              updateRangeField(
                                rangeIdx,
                                "endDate",
                                event.target.value,
                              )
                            }
                            disabled={isSaving}
                            min={selectedSafariOption?.startDate || undefined}
                            max={selectedSafariOption?.endDate || undefined}
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        {!editingId && (
                          <button
                            type="button"
                            onClick={() => addPairToRange(rangeIdx)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                            Add Vehicle Row
                          </button>
                        )}
                      </div>

                      {range.pairs.map((pair, pairIdx) => (
                        <div
                          key={`${rangeIdx}-${pairIdx}`}
                          className="grid grid-cols-1 md:grid-cols-3 gap-3"
                        >
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              Lease Type
                              {range.pairs.length > 1
                                ? " " + (pairIdx + 1)
                                : ""}
                            </label>
                            <select
                              value={
                                pair.vehicleLeaseType ||
                                DEFAULT_VEHICLE_LEASE_TYPE
                              }
                              onChange={(event) =>
                                handleVehicleLeaseTypeChange(
                                  rangeIdx,
                                  pairIdx,
                                  event.target.value,
                                )
                              }
                              disabled={isSaving}
                              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                            >
                              <option value="Short-Term Lease">
                                Short Term
                              </option>
                              <option value="Long-Term Lease">Long Term</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              Vehicle
                              {range.pairs.length > 1
                                ? " " + (pairIdx + 1)
                                : ""}
                            </label>
                            <select
                              value={pair.vehicleId}
                              onChange={(e) =>
                                handleVehicleChange(
                                  rangeIdx,
                                  pairIdx,
                                  e.target.value,
                                )
                              }
                              disabled={isSaving}
                              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                            >
                              <option value="">Select vehicle</option>
                              {getVehiclesForRow(rangeIdx, pairIdx).map(
                                (vehicle) => (
                                  <option key={vehicle.id} value={vehicle.id}>
                                    {getVehicleOptionLabel(vehicle)}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-xs text-slate-400 mb-1">
                                Driver
                                {range.pairs.length > 1
                                  ? " " + (pairIdx + 1)
                                  : ""}
                              </label>
                              <select
                                value={pair.driverId}
                                onChange={(e) =>
                                  handleDriverChange(
                                    rangeIdx,
                                    pairIdx,
                                    e.target.value,
                                  )
                                }
                                disabled={isSaving}
                                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                              >
                                <option value="">Select driver</option>
                                {getDriversForRow(rangeIdx, pairIdx).map(
                                  (driver) => (
                                    <option key={driver.id} value={driver.id}>
                                      {driver.name} ({driver.role})
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>

                            {!editingId && range.pairs.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removePairFromRange(rangeIdx, pairIdx)
                                }
                                disabled={isSaving}
                                className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) => setField("status", event.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
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

              {form.leadId && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5">
                  {(() => {
                    const safari = safariOptions.find(
                      (item) => String(item.leadId) === String(form.leadId),
                    );
                    if (!safari) return null;

                    const detailItems = [
                      { label: "Booking Ref", value: safari.bookingRef },
                      { label: "PI", value: safari.piNo },
                      { label: "Client", value: safari.clientCompany },
                      { label: "Group Name", value: safari.groupName || "-" },
                      {
                        label: "Contact",
                        value: safari.agentContact || "-",
                      },
                      {
                        label: "Vehicles Planned",
                        value:
                          safari.noOfVehicles > 0
                            ? String(safari.noOfVehicles)
                            : "Not specified",
                      },
                      {
                        label: "Rows In This Save",
                        value: String(totalRowsInForm),
                      },
                      {
                        label: "Safari Start",
                        value: formatDate(safari.startDate),
                      },
                      {
                        label: "Safari End",
                        value: formatDate(safari.endDate),
                      },
                      {
                        label: "Allocation Range",
                        value:
                          String(form.ranges.length) +
                          " range" +
                          (form.ranges.length > 1 ? "s" : ""),
                      },
                    ];

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold tracking-wide text-slate-900">
                            Block Details
                          </h3>
                          <span className="text-[11px] uppercase tracking-[0.08em] text-amber-700">
                            Safari Summary
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                          {detailItems.map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border border-amber-200 bg-white px-3 py-2"
                            >
                              <p className="text-[11px] uppercase tracking-[0.08em] text-amber-700">
                                {item.label}
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-900 break-words">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-amber-700">
                            Route
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900 break-words">
                            {safari.routeParks || "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? "Update Allocation"
                    : totalRowsInForm > 1
                      ? "Create " + totalRowsInForm + " Allocations"
                      : "Create Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Allocations currently persist locally in this browser session until
        allocation API endpoints are added.
      </div>
    </div>
  );
}
