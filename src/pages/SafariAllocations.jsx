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

const createFormState = () => ({
  leadId: "",
  vehicleId: "",
  driverId: "",
  notes: "",
  status: "Assigned",
});

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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
  paxAdults: Number(lead.pax_adults ?? lead.paxAdults ?? 0),
  paxChildren: Number(lead.pax_children ?? lead.paxChildren ?? 0),
  bookingStatus: lead.booking_status || lead.bookingStatus || "Pending",
  piSentAt: lead.pi_sent_at || lead.piSentAt || "",
});

const normalizePI = (pi) => ({
  id: Number(pi.id || 0),
  leadId: Number(pi.lead_id || pi.leadId || 0),
  piNo: pi.pi_no || pi.piNo || pi.invoice_no || pi.invoiceNo || `PI-${pi.id}`,
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

const normalizeVehicle = (vehicle) => ({
  id: Number(vehicle.id || 0),
  vehicleNo: vehicle.vehicle_no || vehicle.vehicleNo || "",
  plateNo: vehicle.plate_no || vehicle.plateNo || "",
  make: vehicle.make || "",
  model: vehicle.model || "",
  status: vehicle.status || "Available",
});

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
  notes: allocation.notes || "",
  status: allocation.status || "Assigned",
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

const extractList = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

export default function SafariAllocations() {
  const [leads, setLeads] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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
      const [leadsRes, proformasRes, vehiclesRes, usersRes, allocationsRes] =
        await Promise.all([
          apiFetch("/leads"),
          apiFetch("/proforma-invoices"),
          apiFetch("/vehicles"),
          apiFetch("/users"),
          apiFetch("/safari-allocations"),
        ]);

      const [
        leadsPayload,
        proformasPayload,
        vehiclesPayload,
        usersPayload,
        allocationsPayload,
      ] = await Promise.all([
        leadsRes.json().catch(() => ({})),
        proformasRes.json().catch(() => ({})),
        vehiclesRes.json().catch(() => ({})),
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
      if (!vehiclesRes.ok) {
        throw new Error(
          vehiclesPayload?.message || "Unable to fetch vehicles.",
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
      setVehicles(
        extractList(vehiclesPayload, "vehicles").map(normalizeVehicle),
      );
      setUsers(extractList(usersPayload, "users").map(normalizeUser));
      setAllocations(
        extractList(allocationsPayload, "safariAllocations").map(
          normalizeAllocation,
        ),
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

  const safariOptions = useMemo(() => {
    const latestProformaByLead = new Map();
    proformas.forEach((pi) => {
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
          agentContact: lead.agentContact,
          routeParks: lead.routeParks,
          startDate: lead.startDate,
          endDate: lead.endDate,
          pax: Number(lead.paxAdults || 0) + Number(lead.paxChildren || 0),
          nationality: lead.clientCountry,
        };
      });
  }, [leads, proformas]);

  const driverOptions = useMemo(() => {
    const activeUsers = users.filter(
      (user) => String(user.status).toLowerCase() === "active",
    );
    const opsUsers = activeUsers.filter((user) =>
      String(user.role).toLowerCase().includes("operations"),
    );
    return opsUsers.length > 0 ? opsUsers : activeUsers;
  }, [users]);

  const resolvedAllocations = useMemo(() => {
    return allocations.map((allocation) => {
      const safari = safariOptions.find(
        (item) => item.leadId === String(allocation.leadId),
      );
      const vehicle = vehicles.find(
        (item) => String(item.id) === String(allocation.vehicleId),
      );
      const driver = driverOptions.find(
        (item) => String(item.id) === String(allocation.driverId),
      );
      return {
        ...allocation,
        safari,
        vehicle,
        driver,
      };
    });
  }, [allocations, safariOptions, vehicles, driverOptions]);

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

  const assignedVehicleIds = useMemo(
    () =>
      new Set(
        allocations
          .filter((item) => item.id !== editingId)
          .map((item) => String(item.vehicleId)),
      ),
    [allocations, editingId],
  );

  const assignedDriverIds = useMemo(
    () =>
      new Set(
        allocations
          .filter((item) => item.id !== editingId)
          .map((item) => String(item.driverId)),
      ),
    [allocations, editingId],
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          ["Available", "On Lease"].includes(vehicle.status) &&
          (!assignedVehicleIds.has(String(vehicle.id)) ||
            String(vehicle.id) === String(form.vehicleId)),
      ),
    [vehicles, assignedVehicleIds, form.vehicleId],
  );

  const availableDrivers = useMemo(
    () =>
      driverOptions.filter(
        (driver) =>
          !assignedDriverIds.has(String(driver.id)) ||
          String(driver.id) === String(form.driverId),
      ),
    [driverOptions, assignedDriverIds, form.driverId],
  );

  const stats = useMemo(
    () => ({
      eligibleSafaris: safariOptions.length,
      allocated: allocations.length,
      pending: Math.max(safariOptions.length - allocations.length, 0),
      availableVehicles: vehicleOptions.length,
    }),
    [safariOptions.length, allocations.length, vehicleOptions.length],
  );

  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

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
      vehicleId: String(allocation.vehicleId || ""),
      driverId: String(allocation.driverId || ""),
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
    if (!form.leadId || !form.vehicleId || !form.driverId) {
      setErrorMessage("Please select safari, vehicle, and driver.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please select safari, vehicle, and driver before saving.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    const duplicateSafari = allocations.some(
      (item) =>
        item.id !== editingId && String(item.leadId) === String(form.leadId),
    );
    if (duplicateSafari) {
      setErrorMessage("This safari already has an allocation.");
      await Swal.fire({
        title: "Already Allocated",
        text: "This safari already has a vehicle and driver assignment.",
        icon: "info",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const safari = safariOptions.find(
        (item) => item.leadId === String(form.leadId),
      );

      const payload = {
        leadId: Number(form.leadId),
        proformaInvoiceId: safari?.piId ? Number(safari.piId) : null,
        vehicleId: Number(form.vehicleId),
        driverId: Number(form.driverId),
        notes: form.notes,
        status: form.status,
      };

      if (editingId) {
        // PUT request for update
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

        const next = allocations.map((item) =>
          item.id === editingId ? updatedAllocation : item,
        );
        setAllocations(next);
      } else {
        // POST request for create
        const response = await apiFetch("/safari-allocations", {
          method: "POST",
          body: payload,
        });

        const responsePayload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            responsePayload?.message || "Unable to create safari allocation.",
          );
        }

        const newAllocation = normalizeAllocation(
          extractAllocation(responsePayload),
        );
        setAllocations([newAllocation, ...allocations]);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm(createFormState());

      await Swal.fire({
        title: editingId ? "Updated" : "Created",
        text: editingId
          ? "Safari allocation updated successfully."
          : "Safari allocation created successfully.",
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
          <h1 className="text-2xl font-bold text-white">Safari Allocations</h1>
          <p className="text-slate-400 mt-1">
            Allocate one vehicle and one driver to safari bookings with proforma
            invoices.
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
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Eligible Safaris</p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats.eligibleSafaris}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Allocated</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {stats.allocated}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {stats.pending}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Available Vehicles</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {stats.availableVehicles}
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
            placeholder="Search by safari, PI, vehicle, or driver"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Safari
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  PI
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Route
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Dates
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Vehicle
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Driver
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Status
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
                    colSpan={8}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Loading safari allocations...
                  </td>
                </tr>
              ) : filteredAllocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    No safari allocations yet.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((allocation) => (
                  <tr
                    key={allocation.id}
                    className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                          <ClipboardList className="w-4 h-4 text-amber-400" />
                          {allocation.safari?.bookingRef || "Unknown Safari"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {allocation.safari?.clientCompany || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {allocation.safari?.piNo || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300 max-w-xs">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                        <span>{allocation.safari?.routeParks || "-"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          <div>{formatDate(allocation.safari?.startDate)}</div>
                          <div className="text-xs text-slate-500">
                            to {formatDate(allocation.safari?.endDate)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-slate-400" />
                        {allocation.vehicle
                          ? `${allocation.vehicle.vehicleNo || allocation.vehicle.plateNo} ${allocation.vehicle.make ? `- ${allocation.vehicle.make}` : ""}`
                          : "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        {allocation.driver?.name || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-blue-500/20 text-blue-400 border-blue-500/30">
                        <Users className="w-3 h-3" />
                        {allocation.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(allocation)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(allocation.id)}
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

        {!isLoading && safariOptions.length === 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            No eligible safaris found. A safari becomes eligible when a lead has
            a proforma invoice.
          </div>
        )}
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
                    onChange={(event) => setField("leadId", event.target.value)}
                    disabled={isSaving || Boolean(editingId)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select safari</option>
                    {safariOptions
                      .filter(
                        (item) =>
                          String(item.leadId) === String(form.leadId) ||
                          !allocations.some(
                            (allocation) =>
                              allocation.id !== editingId &&
                              String(allocation.leadId) === String(item.leadId),
                          ),
                      )
                      .map((safari) => (
                        <option key={safari.leadId} value={safari.leadId}>
                          {safari.bookingRef} - {safari.clientCompany} (
                          {safari.piNo})
                        </option>
                      ))}
                  </select>
                  {editingId && (
                    <p className="text-xs text-slate-500 mt-1">
                      Safari cannot be changed while editing this allocation.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Vehicle *
                  </label>
                  <select
                    value={form.vehicleId}
                    onChange={(event) =>
                      setField("vehicleId", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select vehicle</option>
                    {vehicleOptions.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {(vehicle.vehicleNo || vehicle.plateNo) +
                          (vehicle.make
                            ? ` - ${vehicle.make} ${vehicle.model}`
                            : "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Driver *
                  </label>
                  <select
                    value={form.driverId}
                    onChange={(event) =>
                      setField("driverId", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select driver</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.role})
                      </option>
                    ))}
                  </select>
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
                    rows={4}
                    value={form.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 md:col-span-2"
                  />
                </div>
              </div>

              {form.leadId && (
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
                  {(() => {
                    const safari = safariOptions.find(
                      (item) => String(item.leadId) === String(form.leadId),
                    );
                    if (!safari) return null;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Booking Ref</span>
                          <span className="text-white">
                            {safari.bookingRef}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">PI</span>
                          <span className="text-white">{safari.piNo}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Client</span>
                          <span className="text-white">
                            {safari.clientCompany}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Contact</span>
                          <span className="text-white">
                            {safari.agentContact || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Safari Start</span>
                          <span className="text-white">
                            {formatDate(safari.startDate)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Safari End</span>
                          <span className="text-white">
                            {formatDate(safari.endDate)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 md:col-span-2">
                          <span className="text-slate-400">Route</span>
                          <span className="text-white text-right">
                            {safari.routeParks}
                          </span>
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
