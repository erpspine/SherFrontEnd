import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Printer,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

// ─── helpers ────────────────────────────────────────────────────────────────

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

const fmt = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

const fmtMoney = (value, currency = "USD") => `${currency} ${fmt(value)}`;

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Sent: "bg-blue-100 text-blue-700 border-blue-200",
  Confirmed: "bg-amber-100 text-amber-700 border-amber-200",
  Deposit: "bg-purple-100 text-purple-700 border-purple-200",
  Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cancelled: "bg-red-100 text-red-600 border-red-200",
};

const STATUSES = ["Draft", "Sent", "Confirmed", "Deposit", "Paid", "Cancelled"];

const emptyLine = () => ({
  description: "",
  noVehicles: "",
  noDays: "",
  rate: "",
  total: 0,
});

const emptyForm = () => ({
  id: null,
  leaseContractId: "",
  clientName: "",
  attention: "",
  currency: "USD",
  invoiceDate: today(),
  notes: "",
  lineItems: [emptyLine()],
  tax: "18",
  status: "Sent",
});

const emptyPaymentForm = () => ({
  date: today(),
  amount: "",
  method: "Bank Transfer",
  reference: "",
  notes: "",
});

const computeTotals = (lineItems, taxPct) => {
  const subtotal = lineItems.reduce(
    (sum, li) => sum + (Number(li.total) || 0),
    0,
  );
  const tax = (subtotal * (Number(taxPct) || 0)) / 100;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

// ─── component ──────────────────────────────────────────────────────────────

export default function LeaseProformaInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [expandedId, setExpandedId] = useState(null);

  // payment modal
  const [paymentTarget, setPaymentTarget] = useState(null); // invoice
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm());
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  // ── load ──────────────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [piData, contractData] = await Promise.all([
        apiJson("/lease-proforma-invoices"),
        apiJson("/lease-contracts"),
      ]);
      setInvoices(Array.isArray(piData?.invoices) ? piData.invoices : []);
      setContracts(
        Array.isArray(contractData?.contracts) ? contractData.contracts : [],
      );
    } catch (e) {
      setError(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ── derived ───────────────────────────────────────────────────────────────

  const selectedContract = useMemo(
    () =>
      contracts.find((c) => String(c.id) === String(form.leaseContractId)) ??
      null,
    [contracts, form.leaseContractId],
  );

  const {
    subtotal,
    tax: taxAmount,
    total,
  } = useMemo(
    () => computeTotals(form.lineItems, form.tax),
    [form.lineItems, form.tax],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (!term) return true;
      return [inv.proformaNumber, inv.clientName, inv.contract?.clientName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [invoices, search, statusFilter]);

  // ── line item helpers ─────────────────────────────────────────────────────

  const updateLine = (idx, field, value) => {
    setForm((f) => {
      const items = f.lineItems.map((li, i) => {
        if (i !== idx) return li;
        const updated = { ...li, [field]: value };
        // recalculate line total whenever numeric fields change
        const nv =
          Number(field === "noVehicles" ? value : updated.noVehicles) || 0;
        const nd = Number(field === "noDays" ? value : updated.noDays) || 0;
        const r = Number(field === "rate" ? value : updated.rate) || 0;
        updated.total = nv * nd * r;
        return updated;
      });
      return { ...f, lineItems: items };
    });
  };

  const addLine = () =>
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLine()] }));
  const removeLine = (idx) =>
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.filter((_, i) => i !== idx),
    }));

  // ── form open / close ─────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (inv) => {
    setForm({
      id: inv.id,
      leaseContractId: String(inv.leaseContractId || ""),
      clientName: inv.clientName || "",
      attention: inv.attention || "",
      currency: inv.currency || "USD",
      invoiceDate: inv.invoiceDate || today(),
      notes: inv.notes || "",
      lineItems:
        Array.isArray(inv.lineItems) && inv.lineItems.length
          ? inv.lineItems.map((li) => ({
              description: li.description || "",
              noVehicles: li.noVehicles ?? "",
              noDays: li.noDays ?? "",
              rate: li.rate ?? "",
              total: li.total ?? 0,
            }))
          : [emptyLine()],
      tax: String(
        inv.subtotal > 0 ? Math.round((inv.tax / inv.subtotal) * 100) : 0,
      ),
      status: inv.status || "Sent",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
  };

  // Auto-populate client from contract
  const handleContractChange = (contractId) => {
    const c = contracts.find((x) => String(x.id) === String(contractId));
    setForm((f) => ({
      ...f,
      leaseContractId: contractId,
      clientName: c ? c.clientName || "" : f.clientName,
      attention: c ? c.groupName || "" : f.attention,
    }));
  };

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leaseContractId) {
      alert("Please select a lease contract.");
      return;
    }
    if (!form.lineItems.length) {
      alert("At least one line item is required.");
      return;
    }

    const lineItems = form.lineItems.map((li) => ({
      description: li.description || "",
      noVehicles: Number(li.noVehicles) || 0,
      noDays: Number(li.noDays) || 0,
      rate: Number(li.rate) || 0,
      total: Number(li.total) || 0,
    }));

    const payload = {
      leaseContractId: Number(form.leaseContractId),
      clientName: form.clientName,
      attention: form.attention || null,
      currency: form.currency || "USD",
      invoiceDate: form.invoiceDate,
      notes: form.notes || null,
      lineItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      status: form.status,
    };

    setSaving(true);
    try {
      if (form.id) {
        const data = await apiJson(`/lease-proforma-invoices/${form.id}`, {
          method: "PUT",
          body: payload,
        });
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === form.id ? data.invoice : inv)),
        );
      } else {
        const data = await apiJson("/lease-proforma-invoices", {
          method: "POST",
          body: payload,
        });
        setInvoices((prev) => [data.invoice, ...prev]);
      }
      setShowModal(false);
      Swal.fire({
        icon: "success",
        title: form.id ? "Updated" : "Created",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── delete invoice ────────────────────────────────────────────────────────

  const handleDelete = async (inv) => {
    const result = await Swal.fire({
      title: `Delete ${inv.proformaNumber}?`,
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await apiJson(`/lease-proforma-invoices/${inv.id}`, { method: "DELETE" });
      setInvoices((prev) => prev.filter((x) => x.id !== inv.id));
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const handlePrint = async (inv) => {
    const printTab = window.open("", "_blank");

    try {
      const response = await apiFetch(`/lease-proforma-invoices/${inv.id}/pdf`);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (printTab) {
        printTab.location.href = blobUrl;
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (err) {
      if (printTab) printTab.close();
      Swal.fire({
        icon: "error",
        title: "PDF Failed",
        text: err.message || "Failed to open PDF.",
      });
    }
  };

  // ── payments ──────────────────────────────────────────────────────────────

  const openPayment = (inv) => {
    setPaymentTarget(inv);
    setPaymentForm(emptyPaymentForm());
  };
  const closePayment = () => {
    if (savingPayment) return;
    setPaymentTarget(null);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      const data = await apiJson(
        `/lease-proforma-invoices/${paymentTarget.id}/payments`,
        {
          method: "POST",
          body: {
            date: paymentForm.date,
            amount: Number(paymentForm.amount),
            method: paymentForm.method,
            reference: paymentForm.reference || null,
            notes: paymentForm.notes || null,
          },
        },
      );
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === paymentTarget.id ? data.invoice : inv)),
      );
      setPaymentTarget(data.invoice);
      setPaymentForm(emptyPaymentForm());
      Swal.fire({
        icon: "success",
        title: "Payment recorded",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (inv, payment) => {
    if (
      !window.confirm(
        `Delete payment of ${fmtMoney(payment.amount, inv.currency)}?`,
      )
    )
      return;
    setDeletingPaymentId(payment.id);
    try {
      const data = await apiJson(
        `/lease-proforma-invoices/${inv.id}/payments/${payment.id}`,
        { method: "DELETE" },
      );
      setInvoices((prev) =>
        prev.map((x) => (x.id === inv.id ? data.invoice : x)),
      );
      if (paymentTarget?.id === inv.id) setPaymentTarget(data.invoice);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Lease Proforma Invoices
          </h1>
          <p className="text-slate-500 mt-1">
            Create and manage proforma invoices for long-term lease contracts.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 shadow"
        >
          <Plus className="w-4 h-4" /> New Lease PI
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-56"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">PI Number</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Balance</th>
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
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    <FileText className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    No lease proforma invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <>
                    <tr
                      key={inv.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === inv.id ? null : inv.id)
                      }
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {inv.proformaNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {inv.clientName}
                        </div>
                        {inv.attention && (
                          <div className="text-xs text-slate-500">
                            Attention: {inv.attention}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {fmtDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200">
                          {inv.currency || "USD"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">
                        {fmtMoney(inv.total, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={
                            inv.balance > 0
                              ? "text-red-600 font-medium"
                              : "text-emerald-600 font-medium"
                          }
                        >
                          {fmtMoney(inv.balance, inv.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full border ${STATUS_STYLES[inv.status] || "bg-slate-100 text-slate-600"}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPayment(inv)}
                          className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="Payments"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(inv)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === inv.id ? null : inv.id)
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                          title="Expand"
                        >
                          {expandedId === inv.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedId === inv.id && (
                      <tr
                        key={`${inv.id}-detail`}
                        className="bg-slate-50 border-b border-slate-200"
                      >
                        <td colSpan={8} className="px-6 py-4">
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            Line Items
                          </div>
                          <table className="w-full text-sm mb-3 border border-slate-200 rounded">
                            <thead className="bg-slate-100 text-left text-slate-600">
                              <tr>
                                <th className="px-3 py-2">Description</th>
                                <th className="px-3 py-2 text-center">
                                  Vehicles
                                </th>
                                <th className="px-3 py-2 text-center">Days</th>
                                <th className="px-3 py-2 text-right">Rate</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(inv.lineItems || []).map((li, i) => (
                                <tr
                                  key={i}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-3 py-2">
                                    {li.description}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {li.noVehicles}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {li.noDays}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {fmtMoney(li.rate, inv.currency)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    {fmtMoney(li.total, inv.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex justify-end">
                            <div className="text-sm space-y-1 w-56">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Subtotal</span>
                                <span>
                                  {fmtMoney(inv.subtotal, inv.currency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Tax</span>
                                <span>{fmtMoney(inv.tax, inv.currency)}</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-slate-200 pt-1">
                                <span>Total</span>
                                <span>{fmtMoney(inv.total, inv.currency)}</span>
                              </div>
                              <div className="flex justify-between text-emerald-600">
                                <span>Paid</span>
                                <span>
                                  {fmtMoney(inv.paidAmount, inv.currency)}
                                </span>
                              </div>
                              <div className="flex justify-between text-red-600 font-semibold">
                                <span>Balance</span>
                                <span>
                                  {fmtMoney(inv.balance, inv.currency)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {inv.notes && (
                            <p className="text-xs text-slate-500 mt-2">
                              Notes: {inv.notes}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {form.id
                  ? "Edit Lease Proforma Invoice"
                  : "New Lease Proforma Invoice"}
              </h2>
              <button
                onClick={closeModal}
                disabled={saving}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Contract picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Lease Contract *
                  </label>
                  <select
                    required
                    value={form.leaseContractId}
                    onChange={(e) => handleContractChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Select contract…</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName}
                        {c.groupName ? ` – ${c.groupName}` : ""} ({c.leaseType})
                      </option>
                    ))}
                  </select>
                  {selectedContract && (
                    <p className="text-xs text-slate-500 mt-1">
                      {fmtDate(selectedContract.startDate)} →{" "}
                      {fmtDate(selectedContract.endDate)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    required
                    value={form.clientName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clientName: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Attention
                  </label>
                  <input
                    value={form.attention}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, attention: e.target.value }))
                    }
                    placeholder="Attention name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, invoiceDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="TSh">TSh</option>
                  </select>
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
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add line
                  </button>
                </div>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600 text-xs">
                      <tr>
                        <th className="px-3 py-2 w-2/5">Description</th>
                        <th className="px-3 py-2 text-center">No. Vehicles</th>
                        <th className="px-3 py-2 text-center">No. Days</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.lineItems.map((li, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-2 py-1">
                            <input
                              required
                              value={li.description}
                              onChange={(e) =>
                                updateLine(idx, "description", e.target.value)
                              }
                              placeholder="e.g. Vehicle rental – Jun 2026"
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              required
                              type="number"
                              min="1"
                              value={li.noVehicles}
                              onChange={(e) =>
                                updateLine(idx, "noVehicles", e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              required
                              type="number"
                              min="1"
                              value={li.noDays}
                              onChange={(e) =>
                                updateLine(idx, "noDays", e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-center"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              value={li.rate}
                              onChange={(e) =>
                                updateLine(idx, "rate", e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-2 py-1 text-right font-medium text-slate-700 whitespace-nowrap">
                            {fmtMoney(li.total, form.currency)}
                          </td>
                          <td className="px-2 py-1">
                            {form.lineItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-4 items-center">
                  <span className="text-slate-500 w-20 text-right">
                    Subtotal
                  </span>
                  <span className="w-28 text-right font-medium">
                    {fmtMoney(subtotal, form.currency)}
                  </span>
                </div>
                <div className="flex gap-4 items-center">
                  <span className="text-slate-500 w-20 text-right">Tax %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tax}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tax: e.target.value }))
                    }
                    className="w-28 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                  />
                </div>
                <div className="flex gap-4 items-center">
                  <span className="text-slate-500 w-20 text-right">
                    Tax Amt
                  </span>
                  <span className="w-28 text-right">
                    {fmtMoney(taxAmount, form.currency)}
                  </span>
                </div>
                <div className="flex gap-4 items-center font-semibold text-slate-900 border-t border-slate-200 pt-1">
                  <span className="w-20 text-right">Total</span>
                  <span className="w-28 text-right">
                    {fmtMoney(total, form.currency)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
                >
                  {saving ? "Saving…" : form.id ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Modal ───────────────────────────────────────────────── */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Payments — {paymentTarget.proformaNumber}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total: {fmtMoney(paymentTarget.total, paymentTarget.currency)}{" "}
                  · Paid:{" "}
                  {fmtMoney(paymentTarget.paidAmount, paymentTarget.currency)} ·
                  Balance:{" "}
                  {fmtMoney(paymentTarget.balance, paymentTarget.currency)}
                </p>
              </div>
              <button
                onClick={closePayment}
                disabled={savingPayment}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* existing payments */}
              {(paymentTarget.payments || []).length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentTarget.payments.map((p) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{fmtDate(p.date)}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {p.method}
                            {p.reference ? ` – ${p.reference}` : ""}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {fmtMoney(p.amount, paymentTarget.currency)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() =>
                                handleDeletePayment(paymentTarget, p)
                              }
                              disabled={deletingPaymentId === p.id}
                              className="text-slate-400 hover:text-red-500 disabled:opacity-50"
                            >
                              {deletingPaymentId === p.id ? (
                                <Loader className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* add payment form */}
              {paymentTarget.balance > 0 && (
                <form onSubmit={handleAddPayment} className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Record Payment
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Date *
                      </label>
                      <input
                        required
                        type="date"
                        value={paymentForm.date}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            date: e.target.value,
                          }))
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Amount *
                      </label>
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            amount: e.target.value,
                          }))
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Method *
                      </label>
                      <select
                        required
                        value={paymentForm.method}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            method: e.target.value,
                          }))
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                      >
                        {[
                          "Bank Transfer",
                          "Cash",
                          "Cheque",
                          "Mobile Money",
                          "Other",
                        ].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Reference
                      </label>
                      <input
                        value={paymentForm.reference}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            reference: e.target.value,
                          }))
                        }
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closePayment}
                      className="px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingPayment}
                      className="px-4 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-70"
                    >
                      {savingPayment ? "Saving…" : "Record Payment"}
                    </button>
                  </div>
                </form>
              )}

              {paymentTarget.balance <= 0 && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Fully paid
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
