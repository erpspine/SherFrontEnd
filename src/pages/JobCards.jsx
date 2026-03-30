import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  Download,
  Edit,
  Globe,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import Swal from "sweetalert2";

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

const toInputDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
};

const normalizeLead = (lead) => ({
  id: lead.id,
  bookingRef: lead.booking_ref || lead.bookingRef || "-",
  clientCompany: lead.client_company || lead.clientCompany || "-",
  agentContact: lead.agent_contact || lead.agentContact || "-",
  clientCountry: lead.client_country || lead.clientCountry || "-",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
  routeParks: lead.route_parks || lead.routeParks || "-",
  paxAdults: Number(lead.pax_adults ?? lead.paxAdults ?? 0),
  paxChildren: Number(lead.pax_children ?? lead.paxChildren ?? 0),
  noOfVehicles: Number(lead.no_of_vehicles ?? lead.noOfVehicles ?? 0),
  bookingStatus: lead.booking_status || lead.bookingStatus || "Pending",
  sentBy: lead.sent_by || lead.sentBy || "",
  quotationSentAt: lead.quotation_sent_at || lead.quotationSentAt || "",
  piSentAt: lead.pi_sent_at || lead.piSentAt || "",
  specialRequirements:
    lead.special_requirements || lead.specialRequirements || "",
  agentPhone: lead.agent_phone || lead.agentPhone || "",
  agentEmail: lead.agent_email || lead.agentEmail || "",
});

const extractList = (payload, preferredKey) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (preferredKey && Array.isArray(payload?.[preferredKey])) {
    return payload[preferredKey];
  }
  if (Array.isArray(payload?.leads)) return payload.leads;
  if (Array.isArray(payload?.jobCards)) return payload.jobCards;
  if (Array.isArray(payload?.job_cards)) return payload.job_cards;
  return [];
};

const extractSingle = (payload, preferredKey) =>
  payload?.data ||
  (preferredKey ? payload?.[preferredKey] : undefined) ||
  payload?.jobCard ||
  payload?.job_card ||
  payload;

const normalizeJobCard = (jobCard) => ({
  id: jobCard.id,
  leadId: Number(jobCard.lead_id || jobCard.leadId || 0),
  jobCardNo: jobCard.job_card_no || jobCard.jobCardNo || "-",
  bookingReferenceNo:
    jobCard.booking_reference_no ||
    jobCard.bookingReferenceNo ||
    jobCard.booking_ref ||
    "-",
  tourOperatorClientName:
    jobCard.tour_operator_client_name ||
    jobCard.tourOperatorClientName ||
    jobCard.client_company ||
    "-",
  contactPerson: jobCard.contact_person || jobCard.contactPerson || "-",
  contactNumber: jobCard.contact_number || jobCard.contactNumber || "",
  contactEmail: jobCard.contact_email || jobCard.contactEmail || "",
  adults: Number(jobCard.adults || 0),
  children: Number(jobCard.children || 0),
  nationality: jobCard.nationality || "",
  guideLanguage: jobCard.guide_language || jobCard.guideLanguage || "English",
  safariStartDate: jobCard.safari_start_date || jobCard.safariStartDate || "",
  safariEndDate: jobCard.safari_end_date || jobCard.safariEndDate || "",
  numberOfDays: Number(jobCard.number_of_days || jobCard.numberOfDays || 1),
  routeSummary: jobCard.route_summary || jobCard.routeSummary || "",
  routeItinerary: jobCard.route_itinerary || jobCard.routeItinerary || [],
  pickupLocation: jobCard.pickup_location || jobCard.pickupLocation || "",
  dropoffLocation: jobCard.dropoff_location || jobCard.dropoffLocation || "",
  additionalDetails:
    jobCard.additional_details || jobCard.additionalDetails || "",
  createdAt: jobCard.created_at || jobCard.createdAt || "",
});

const createEmptyForm = () => ({
  leadId: "",
  guideLanguage: "English",
  safariStartDate: "",
  safariEndDate: "",
  numberOfDays: 1,
  pickupLocation: "",
  dropoffLocation: "",
  routeSummary: "",
  additionalDetails: "",
  bookingReferenceNo: "",
  tourOperatorClientName: "",
  contactPerson: "",
  contactNumber: "",
  contactEmail: "",
  adults: 0,
  children: 0,
  nationality: "",
});

const buildFormFromLead = (lead) => ({
  leadId: String(lead.id),
  guideLanguage: "English",
  safariStartDate: toInputDate(lead.startDate),
  safariEndDate: toInputDate(lead.endDate),
  numberOfDays: Math.max(
    1,
    lead.startDate && lead.endDate
      ? Math.floor(
          (new Date(lead.endDate).getTime() -
            new Date(lead.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 1,
  ),
  pickupLocation: "",
  dropoffLocation: "",
  routeSummary: lead.routeParks || "",
  additionalDetails: lead.specialRequirements || "",
  bookingReferenceNo: lead.bookingRef || "",
  tourOperatorClientName: lead.clientCompany || "",
  contactPerson: lead.agentContact || "",
  contactNumber: lead.agentPhone || "",
  contactEmail: lead.agentEmail || "",
  adults: Number(lead.paxAdults || 0),
  children: Number(lead.paxChildren || 0),
  nationality: lead.clientCountry || "",
});

const buildFormFromJobCard = (jobCard) => ({
  leadId: String(jobCard.leadId || ""),
  guideLanguage: jobCard.guideLanguage || "English",
  safariStartDate: toInputDate(jobCard.safariStartDate),
  safariEndDate: toInputDate(jobCard.safariEndDate),
  numberOfDays: Number(jobCard.numberOfDays || 1),
  pickupLocation: jobCard.pickupLocation || "",
  dropoffLocation: jobCard.dropoffLocation || "",
  routeSummary: jobCard.routeSummary || "",
  additionalDetails: jobCard.additionalDetails || "",
  bookingReferenceNo: jobCard.bookingReferenceNo || "",
  tourOperatorClientName: jobCard.tourOperatorClientName || "",
  contactPerson: jobCard.contactPerson || "",
  contactNumber: jobCard.contactNumber || "",
  contactEmail: jobCard.contactEmail || "",
  adults: Number(jobCard.adults || 0),
  children: Number(jobCard.children || 0),
  nationality: jobCard.nationality || "",
});

export default function JobCards() {
  const [leads, setLeads] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingJobCardId, setDownloadingJobCardId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [jobCardsResponse, leadsResponse] = await Promise.all([
        apiFetch("/job-cards"),
        apiFetch("/leads"),
      ]);

      const [jobCardsPayload, leadsPayload] = await Promise.all([
        jobCardsResponse.json().catch(() => ({})),
        leadsResponse.json().catch(() => ({})),
      ]);

      if (!jobCardsResponse.ok) {
        throw new Error(
          jobCardsPayload?.message || "Unable to fetch job cards.",
        );
      }

      if (!leadsResponse.ok) {
        throw new Error(leadsPayload?.message || "Unable to fetch leads.");
      }

      setJobCards(
        extractList(jobCardsPayload, "jobCards").map(normalizeJobCard),
      );
      setLeads(extractList(leadsPayload, "leads").map(normalizeLead));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load job cards.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleLeads = useMemo(
    () =>
      leads.filter(
        (lead) => lead.bookingStatus === "PI Sent" || Boolean(lead.piSentAt),
      ),
    [leads],
  );

  const filteredCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return jobCards;

    return jobCards.filter((card) => {
      return (
        String(card.jobCardNo || "")
          .toLowerCase()
          .includes(query) ||
        String(card.bookingReferenceNo || "")
          .toLowerCase()
          .includes(query) ||
        String(card.tourOperatorClientName || "")
          .toLowerCase()
          .includes(query) ||
        String(card.contactPerson || "")
          .toLowerCase()
          .includes(query) ||
        String(card.routeSummary || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [jobCards, searchTerm]);

  const stats = useMemo(() => {
    const totalPax = filteredCards.reduce(
      (sum, card) =>
        sum + Number(card.adults || 0) + Number(card.children || 0),
      0,
    );

    return {
      totalCards: filteredCards.length,
      totalPax,
      totalLeadsWithPI: eligibleLeads.length,
    };
  }, [filteredCards, eligibleLeads.length]);

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setIsModalOpen(true);
  };

  const onSelectLead = (leadIdValue) => {
    const lead = eligibleLeads.find((item) => String(item.id) === leadIdValue);
    if (!lead) {
      setField("leadId", leadIdValue);
      return;
    }
    setForm(buildFormFromLead(lead));
  };

  const openEdit = async (jobCard) => {
    setErrorMessage("");
    try {
      const response = await apiFetch(`/job-cards/${jobCard.id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch job card.");
      }
      const selected = normalizeJobCard(extractSingle(payload, "jobCard"));
      setEditingId(selected.id);
      setForm(buildFormFromJobCard(selected));
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open job card details.");
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to open job card details.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({
      title: "Delete job card?",
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
      const response = await apiFetch(`/job-cards/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to delete job card.");
      }

      setJobCards((current) => current.filter((card) => card.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "Job card deleted successfully.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete job card.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete job card.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleDownloadPdf = async (jobCard) => {
    setDownloadingJobCardId(jobCard.id);
    try {
      const response = await apiFetch(`/job-cards/${jobCard.id}/pdf`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${jobCard.jobCardNo || `job-card-${jobCard.id}`}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      await Swal.fire({
        title: "PDF Failed",
        text: error.message || "Failed to download PDF.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setDownloadingJobCardId(null);
    }
  };

  const handleSave = async () => {
    if (!form.leadId) {
      setErrorMessage("Please select a PI-issued lead.");
      await Swal.fire({
        title: "Missing Lead",
        text: "Please select a lead with PI Sent before saving.",
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
        leadId: Number(form.leadId),
        guideLanguage: form.guideLanguage || "English",
        safariStartDate: form.safariStartDate || undefined,
        safariEndDate: form.safariEndDate || undefined,
        numberOfDays: Number(form.numberOfDays || 1),
        pickupLocation: form.pickupLocation || null,
        dropoffLocation: form.dropoffLocation || null,
        routeSummary: form.routeSummary || null,
        additionalDetails: form.additionalDetails || null,
        bookingReferenceNo: form.bookingReferenceNo || undefined,
        tourOperatorClientName: form.tourOperatorClientName || undefined,
        contactPerson: form.contactPerson || undefined,
        contactNumber: form.contactNumber || undefined,
        contactEmail: form.contactEmail || null,
        adults: Number(form.adults || 0),
        children: Number(form.children || 0),
        nationality: form.nationality || null,
      };

      const response = editingId
        ? await apiFetch(`/job-cards/${editingId}`, {
            method: "PUT",
            body: payload,
          })
        : await apiFetch("/job-cards", {
            method: "POST",
            body: payload,
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save job card.");
      }

      const saved = normalizeJobCard(extractSingle(data, "jobCard"));
      setJobCards((current) => {
        if (editingId) {
          return current.map((item) => (item.id === editingId ? saved : item));
        }
        return [saved, ...current];
      });

      setIsModalOpen(false);
      setEditingId(null);
      setForm(createEmptyForm());

      await Swal.fire({
        title: editingId ? "Updated" : "Created",
        text: editingId
          ? "Job card updated successfully."
          : "Job card created successfully.",
        icon: "success",
        timer: 1700,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save job card.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save job card.",
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
          <h1 className="text-2xl font-bold text-white">Job Cards</h1>
          <p className="text-slate-400 mt-1">
            Safari operations issued to fleet manager, generated from PI leads.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New Job Card
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">PI Job Cards</p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats.totalCards}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Safari Pax</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {stats.totalPax}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">PI Eligible Leads</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {stats.totalLeadsWithPI}
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
            placeholder="Search by booking ref, company, contact, park route"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Job Card No
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Booking Ref
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Client / Contact
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Dates
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Pax
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Nationality
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Route Summary
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                  Created At
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
                    colSpan={9}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Loading job cards...
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    No job cards found. Create one from a PI-issued lead.
                  </td>
                </tr>
              ) : (
                filteredCards.map((card) => (
                  <tr
                    key={card.id}
                    className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 text-white text-sm font-medium">
                        <ClipboardList className="w-4 h-4 text-amber-400" />
                        {card.jobCardNo}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      {card.bookingReferenceNo}
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-white text-sm">
                          <User className="w-4 h-4 text-slate-400" />
                          {card.tourOperatorClientName}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <span>{card.contactPerson}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          <div>{formatDate(card.safariStartDate)}</div>
                          <div className="text-xs text-slate-500">
                            to {formatDate(card.safariEndDate)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {Number(card.adults || 0) + Number(card.children || 0)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        {card.nationality || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                        <span>{card.routeSummary || "-"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300">
                      {formatDateTime(card.createdAt)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleDownloadPdf(card)}
                          disabled={downloadingJobCardId === card.id}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title={
                            downloadingJobCardId === card.id
                              ? "Downloading..."
                              : "Download PDF"
                          }
                        >
                          {downloadingJobCardId === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(card)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
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

          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit Job Card" : "Create Job Card"}
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
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Lead (PI Sent) *
                  </label>
                  <select
                    value={form.leadId}
                    onChange={(event) => onSelectLead(event.target.value)}
                    disabled={isSaving || Boolean(editingId)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select lead</option>
                    {eligibleLeads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.bookingRef} - {lead.clientCompany}
                      </option>
                    ))}
                  </select>
                  {editingId && (
                    <p className="text-xs text-slate-500 mt-1">
                      Lead cannot be changed while editing.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Guide Language
                  </label>
                  <input
                    value={form.guideLanguage}
                    onChange={(event) =>
                      setField("guideLanguage", event.target.value)
                    }
                    placeholder="English"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Safari Start Date
                  </label>
                  <input
                    type="date"
                    value={form.safariStartDate}
                    onChange={(event) =>
                      setField("safariStartDate", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Safari End Date
                  </label>
                  <input
                    type="date"
                    value={form.safariEndDate}
                    onChange={(event) =>
                      setField("safariEndDate", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Number of Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.numberOfDays}
                    onChange={(event) =>
                      setField("numberOfDays", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Booking Reference
                  </label>
                  <input
                    value={form.bookingReferenceNo}
                    onChange={(event) =>
                      setField("bookingReferenceNo", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Client Name
                  </label>
                  <input
                    value={form.tourOperatorClientName}
                    onChange={(event) =>
                      setField("tourOperatorClientName", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Contact Person
                  </label>
                  <input
                    value={form.contactPerson}
                    onChange={(event) =>
                      setField("contactPerson", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Contact Number
                  </label>
                  <input
                    value={form.contactNumber}
                    onChange={(event) =>
                      setField("contactNumber", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) =>
                      setField("contactEmail", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Adults
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.adults}
                    onChange={(event) => setField("adults", event.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.children}
                    onChange={(event) =>
                      setField("children", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nationality
                  </label>
                  <input
                    value={form.nationality}
                    onChange={(event) =>
                      setField("nationality", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Pickup Location
                  </label>
                  <input
                    value={form.pickupLocation}
                    onChange={(event) =>
                      setField("pickupLocation", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Dropoff Location
                  </label>
                  <input
                    value={form.dropoffLocation}
                    onChange={(event) =>
                      setField("dropoffLocation", event.target.value)
                    }
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Route Summary
                </label>
                <textarea
                  rows={2}
                  value={form.routeSummary}
                  onChange={(event) =>
                    setField("routeSummary", event.target.value)
                  }
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Additional Details
                </label>
                <textarea
                  rows={3}
                  value={form.additionalDetails}
                  onChange={(event) =>
                    setField("additionalDetails", event.target.value)
                  }
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
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
                    ? "Update Job Card"
                    : "Create Job Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
