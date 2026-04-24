import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Car,
  UserCheck,
  FileCheck,
} from "lucide-react";
import Datepicker from "react-tailwindcss-datepicker";
import { apiFetch } from "../utils/api";
import Swal from "sweetalert2";

const statusConfig = {
  Pending: {
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: Clock,
  },
  Confirmed: {
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle,
  },
  Cancelled: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
  Completed: {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: FileCheck,
  },
  "Quotation Sent": {
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Mail,
  },
  "PI Sent": {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: FileCheck,
  },
};

const allStatuses = [
  "Pending",
  "Confirmed",
  "Cancelled",
  "Completed",
  "Quotation Sent",
  "PI Sent",
];

const countries = [
  "Tanzania",
  "Kenya",
  "Uganda",
  "Rwanda",
  "Zambia",
  "South Africa",
  "UAE",
  "UK",
  "USA",
  "Germany",
  "France",
];

// Backward compatibility for modules (e.g., Quotations) that still import leadsData.
export const leadsData = [];

const createEmptyForm = () => ({
  bookingRef: "",
  clientCompany: "",
  agentContact: "",
  agentEmail: "",
  agentPhone: "",
  clientCountry: "",
  startDate: "",
  endDate: "",
  routeParks: "",
  paxAdults: "",
  paxChildren: "",
  noOfVehicles: "",
  specialRequirements: "",
  bookingStatus: "Pending",
});

const normalizeDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const toPickerValue = (value) => ({
  startDate: value || null,
  endDate: value || null,
});

const toApiDate = (value) => {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizeLead = (l) => ({
    id: l.id,
    bookingRef: l.booking_ref || l.bookingRef || "",
    clientCompany: l.client_company || l.clientCompany || "",
    agentContact: l.agent_contact || l.agentContact || "",
    agentEmail: l.agent_email || l.agentEmail || "",
    agentPhone: l.agent_phone || l.agentPhone || "",
    clientCountry: l.client_country || l.clientCountry || "",
    startDate: normalizeDateValue(l.start_date || l.startDate),
    endDate: normalizeDateValue(l.end_date || l.endDate),
    routeParks: l.route_parks || l.routeParks || "",
    paxAdults: l.pax_adults ?? l.paxAdults ?? 0,
    paxChildren: l.pax_children ?? l.paxChildren ?? 0,
    noOfVehicles: l.no_of_vehicles ?? l.noOfVehicles ?? 1,
    specialRequirements: l.special_requirements || l.specialRequirements || "",
    bookingStatus: l.booking_status || l.bookingStatus || "Pending",
    sentBy: l.sent_by || l.sentBy || "",
    sentById: l.sent_by_id ?? l.sentById ?? null,
    quotationSentAt: l.quotation_sent_at || l.quotationSentAt || "",
    piSentAt: l.pi_sent_at || l.piSentAt || "",
  });

  const extractList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.leads)) return payload.leads;
    return [];
  };

  const extractSingle = (payload) => payload?.data || payload?.lead || payload;

  const loadLeads = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const response = await apiFetch("/leads");
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.message || "Unable to fetch leads.");
      setLeads(extractList(payload).map(normalizeLead));
    } catch (err) {
      setErrorMessage(err.message || "Failed to load leads.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const stats = {
    total: leads.length,
    pending: leads.filter((l) => l.bookingStatus === "Pending").length,
    confirmed: leads.filter((l) => l.bookingStatus === "Confirmed").length,
    cancelled: leads.filter((l) => l.bookingStatus === "Cancelled").length,
    completed: leads.filter((l) => l.bookingStatus === "Completed").length,
    quotationSent: leads.filter((l) => l.bookingStatus === "Quotation Sent")
      .length,
    piSent: leads.filter((l) => l.bookingStatus === "PI Sent").length,
  };

  const filtered = leads.filter((lead) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      lead.bookingRef.toLowerCase().includes(q) ||
      lead.clientCompany.toLowerCase().includes(q) ||
      lead.agentContact.toLowerCase().includes(q) ||
      lead.routeParks.toLowerCase().includes(q) ||
      lead.clientCountry.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "All" || lead.bookingStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const openNew = () => {
    setErrorMessage("");
    setForm(createEmptyForm());
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = async (lead) => {
    setErrorMessage("");
    try {
      const response = await apiFetch(`/leads/${lead.id}`);
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.message || "Unable to fetch lead.");
      const l = normalizeLead(extractSingle(payload));
      setEditingId(l.id);
      setForm({ ...l });
      setIsModalOpen(true);
    } catch (err) {
      setErrorMessage(err.message || "Unable to open lead details.");
    }
  };

  const handleDelete = async (id) => {
    setErrorMessage("");
    const confirmation = await Swal.fire({
      title: "Delete lead?",
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
      const response = await apiFetch(`/leads/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message || "Unable to delete lead.");
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "Lead deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete lead.");
      await Swal.fire({
        title: "Delete Failed",
        text: err.message || "Failed to delete lead.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleSave = async () => {
    if (!form.clientCompany || !form.agentContact || !form.startDate) {
      setErrorMessage("Please fill all required fields before saving.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please fill Client Company, Agent Contact, and Start Date.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      const bookingStatus = allStatuses.includes(form.bookingStatus)
        ? form.bookingStatus
        : "Pending";
      const body = {
        clientCompany: form.clientCompany,
        agentContact: form.agentContact,
        agentEmail: form.agentEmail,
        agentPhone: form.agentPhone,
        clientCountry: form.clientCountry,
        startDate: toApiDate(form.startDate),
        endDate: toApiDate(form.endDate),
        routeParks: form.routeParks,
        paxAdults: Number(form.paxAdults || 0),
        paxChildren: Number(form.paxChildren || 0),
        noOfVehicles: Number(form.noOfVehicles || 1),
        specialRequirements: form.specialRequirements || null,
        bookingStatus,
      };
      const response = editingId
        ? await apiFetch(`/leads/${editingId}`, { method: "PUT", body })
        : await apiFetch("/leads", { method: "POST", body });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.message || "Unable to save lead.");
      setIsModalOpen(false);
      await loadLeads();
      await Swal.fire({
        title: editingId ? "Updated" : "Created",
        text: editingId
          ? "Lead updated successfully."
          : "Lead created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (err) {
      setErrorMessage(err.message || "Failed to save lead.");
      await Swal.fire({
        title: "Save Failed",
        text: err.message || "Failed to save lead.",
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-slate-400 mt-1">
            Track incoming booking enquiries and manage lead conversions.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400" },
          {
            label: "Confirmed",
            value: stats.confirmed,
            color: "text-green-400",
          },
          {
            label: "Completed",
            value: stats.completed,
            color: "text-blue-400",
          },
          {
            label: "Quotation Sent",
            value: stats.quotationSent,
            color: "text-amber-400",
          },
          {
            label: "PI Sent",
            value: stats.piSent,
            color: "text-purple-400",
          },
          { label: "Cancelled", value: stats.cancelled, color: "text-red-400" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center"
          >
            <p className="text-slate-400 text-sm">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
            <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by ref, company, agent, country, or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", ...allStatuses].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-amber-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1760px]">
            <thead>
              <tr className="border-b border-slate-800">
                {[
                  "Booking Ref",
                  "Client Company",
                  "Agent Contact",
                  "Agent Email",
                  "Agent Phone",
                  "Country",
                  "Start Date",
                  "End Date",
                  "Route / Parks",
                  "Pax Adults",
                  "Pax Children",
                  "Vehicles",
                  "Special Requirements",
                  "Status",
                  "Sent By",
                  "Quotation Sent At",
                  "PI Sent At",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-4 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const cfg =
                  statusConfig[lead.bookingStatus] || statusConfig.Pending;
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                  >
                    {/* Booking Ref */}
                    <td className="py-3 px-4">
                      <span className="text-blue-400 font-mono text-sm font-medium">
                        {lead.bookingRef}
                      </span>
                    </td>
                    {/* Client Company */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <span className="text-sm text-white font-medium whitespace-nowrap">
                          {lead.clientCompany}
                        </span>
                      </div>
                    </td>
                    {/* Agent Contact */}
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {lead.agentContact}
                    </td>
                    {/* Agent Email */}
                    <td className="py-3 px-4">
                      <a
                        href={`mailto:${lead.agentEmail}`}
                        className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Mail className="w-3 h-3" />
                        {lead.agentEmail}
                      </a>
                    </td>
                    {/* Agent Phone */}
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {lead.agentPhone}
                    </td>
                    {/* Country */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-slate-300 whitespace-nowrap">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        {lead.clientCountry}
                      </div>
                    </td>
                    {/* Start Date */}
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {lead.startDate}
                    </td>
                    {/* End Date */}
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {lead.endDate}
                    </td>
                    {/* Route / Parks */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span
                          className="max-w-[160px] truncate"
                          title={lead.routeParks}
                        >
                          {lead.routeParks}
                        </span>
                      </div>
                    </td>
                    {/* Pax Adults */}
                    <td className="py-3 px-4 text-center text-sm text-slate-300">
                      {lead.paxAdults}
                    </td>
                    {/* Pax Children */}
                    <td className="py-3 px-4 text-center text-sm text-slate-300">
                      {lead.paxChildren}
                    </td>
                    {/* Vehicles */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1 text-sm text-slate-300">
                        <Car className="w-3.5 h-3.5 text-slate-500" />
                        {lead.noOfVehicles}
                      </div>
                    </td>
                    {/* Special Requirements */}
                    <td className="py-3 px-4">
                      <span
                        className="text-sm text-slate-400 max-w-[180px] block truncate"
                        title={lead.specialRequirements}
                      >
                        {lead.specialRequirements || "—"}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${cfg.color}`}
                      >
                        <cfg.icon className="w-3 h-3" />
                        {lead.bookingStatus}
                      </span>
                    </td>
                    {/* Sent By */}
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {lead.sentBy || "-"}
                    </td>
                    {/* Quotation Sent At */}
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {formatDateTime(lead.quotationSentAt)}
                    </td>
                    {/* PI Sent At */}
                    <td className="py-3 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {formatDateTime(lead.piSentAt)}
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(lead)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">
              No leads found matching your search or filter.
            </div>
          )}
          {isLoading && (
            <div className="py-16 text-center text-slate-500 text-sm">
              Loading leads...
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {filtered.length} of {leads.length} leads
          </p>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingId !== null ? "Edit Lead" : "New Lead"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editingId !== null
                    ? `Editing ${form.bookingRef}`
                    : "Booking reference will be generated by backend."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Client & Agent */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Client & Agent Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Client Company <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.clientCompany}
                      onChange={(e) =>
                        setField("clientCompany", e.target.value)
                      }
                      placeholder="e.g. Hassan Trading Co."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Client Country
                    </label>
                    <select
                      value={form.clientCountry}
                      onChange={(e) =>
                        setField("clientCountry", e.target.value)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Select country...</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Agent Contact <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.agentContact}
                      onChange={(e) => setField("agentContact", e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Agent Phone
                    </label>
                    <input
                      type="tel"
                      value={form.agentPhone}
                      onChange={(e) => setField("agentPhone", e.target.value)}
                      placeholder="+255 7xx xxx xxx"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Agent Email
                    </label>
                    <input
                      type="email"
                      value={form.agentEmail}
                      onChange={(e) => setField("agentEmail", e.target.value)}
                      placeholder="agent@company.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Trip Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <Datepicker
                      useRange={false}
                      asSingle
                      primaryColor="amber"
                      value={toPickerValue(form.startDate)}
                      onChange={(newValue) =>
                        setField("startDate", newValue?.startDate || "")
                      }
                      displayFormat="DD/MM/YYYY"
                      inputClassName="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      toggleClassName="absolute right-0 h-full px-3 text-slate-400"
                      containerClassName="relative"
                      popoverDirection="down"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      End Date
                    </label>
                    <Datepicker
                      useRange={false}
                      asSingle
                      primaryColor="amber"
                      value={toPickerValue(form.endDate)}
                      onChange={(newValue) =>
                        setField("endDate", newValue?.startDate || "")
                      }
                      displayFormat="DD/MM/YYYY"
                      inputClassName="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      toggleClassName="absolute right-0 h-full px-3 text-slate-400"
                      containerClassName="relative"
                      popoverDirection="down"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Route / Parks
                    </label>
                    <input
                      type="text"
                      value={form.routeParks}
                      onChange={(e) => setField("routeParks", e.target.value)}
                      placeholder="e.g. Serengeti, Ngorongoro"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pax & Vehicles */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-400" />
                  Passengers & Vehicles
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Pax Adults
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.paxAdults}
                      onChange={(e) => setField("paxAdults", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Pax Children
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.paxChildren}
                      onChange={(e) => setField("paxChildren", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      No. of Vehicles
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.noOfVehicles}
                      onChange={(e) => setField("noOfVehicles", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Special Requirements & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Special Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={form.specialRequirements}
                    onChange={(e) =>
                      setField("specialRequirements", e.target.value)
                    }
                    placeholder="Any special requests or notes..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Booking Status
                  </label>
                  <select
                    value={form.bookingStatus}
                    onChange={(e) => setField("bookingStatus", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    !form.clientCompany ||
                    !form.agentContact ||
                    !form.startDate ||
                    isSaving
                  }
                  className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Create Lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
