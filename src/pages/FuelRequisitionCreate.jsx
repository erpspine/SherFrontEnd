import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Fuel,
  Loader2,
  SendHorizonal,
  AlertCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const normalizeLead = (lead) => ({
  id: lead.id,
  bookingRef: lead.booking_ref || lead.bookingRef || "",
  clientCompany: lead.client_company || lead.clientCompany || "",
  routeParks: lead.route_parks || lead.routeParks || "",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
});

const extractLeads = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.leads)) return payload.leads;
  return [];
};

export default function FuelRequisitionCreate() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    leadId: "",
    litres: "",
    reason: "",
  });

  const selectedLead = useMemo(
    () => leads.find((lead) => String(lead.id) === String(form.leadId)) || null,
    [leads, form.leadId],
  );

  useEffect(() => {
    const loadLeads = async () => {
      setIsLoadingLeads(true);
      setErrorMessage("");

      try {
        const response = await apiFetch("/leads");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load leads.");
        }

        setLeads(extractLeads(payload).map(normalizeLead));
      } catch (error) {
        setErrorMessage(error.message || "Failed to load leads.");
      } finally {
        setIsLoadingLeads(false);
      }
    };

    loadLeads();
  }, []);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const litres = Number(form.litres);

    if (!form.leadId) {
      setErrorMessage("Please select a lead.");
      return;
    }

    if (!Number.isFinite(litres) || litres <= 0) {
      setErrorMessage("Please enter litres greater than 0.");
      return;
    }

    if (!form.reason.trim()) {
      setErrorMessage("Please provide a reason for this requisition.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch("/fuel-requisitions", {
        method: "POST",
        body: {
          leadId: Number(form.leadId),
          litres,
          reason: form.reason.trim(),
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to create fuel requisition.",
        );
      }

      await Swal.fire({
        title: "Submitted",
        text: "Fuel requisition created and notification email sent.",
        icon: "success",
        timer: 1700,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });

      navigate("/fuel-requisitions", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit fuel requisition.");
      await Swal.fire({
        title: "Submission Failed",
        text: error.message || "Failed to submit fuel requisition.",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            New Fuel Requisition
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a lead, provide litres needed, and submit the reason.
          </p>
        </div>

        <Link
          to="/fuel-requisitions"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sher-teal/10 to-sher-gold/10 px-6 py-4">
          <div className="rounded-xl border border-sher-teal/20 bg-white p-2 text-sher-teal">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Fuel Request Details
            </h2>
            <p className="text-sm text-slate-600">
              This request will trigger notification emails to opted-in users.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Lead
              </span>
              <select
                value={form.leadId}
                onChange={(event) => setField("leadId", event.target.value)}
                disabled={isLoadingLeads || isSaving}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.bookingRef || `Lead #${lead.id}`} -{" "}
                    {lead.clientCompany || "No company"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Litres Needed
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.litres}
                onChange={(event) => setField("litres", event.target.value)}
                disabled={isSaving}
                placeholder="e.g. 80"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
              />
            </label>
          </div>

          {selectedLead && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-800">
                Selected Lead Snapshot
              </div>
              <div className="mt-1">
                Booking Ref: {selectedLead.bookingRef || "-"}
              </div>
              <div>Route/Parks: {selectedLead.routeParks || "-"}</div>
              <div>
                Dates: {selectedLead.startDate || "-"} to{" "}
                {selectedLead.endDate || "-"}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Reason
            </span>
            <textarea
              rows={5}
              value={form.reason}
              onChange={(event) => setField("reason", event.target.value)}
              disabled={isSaving}
              placeholder="Explain why this fuel is needed."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving || isLoadingLeads}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sher-gold to-sher-gold-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
              {isSaving ? "Submitting..." : "Submit Requisition"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/fuel-requisitions")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
