import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  FileSpreadsheet,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Wallet,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const formatCurrency = (value) =>
  `USD ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const calcStatus = (invoice) => {
  const balance = Number(invoice.total || 0) - Number(invoice.paid || 0);
  if (balance <= 0) return "Paid";
  const due = new Date(invoice.dueDate);
  const today = new Date();
  if (!Number.isNaN(due.getTime()) && due < new Date(today.toDateString())) {
    return "Overdue";
  }
  return invoice.paid > 0 ? "Partially Paid" : "Open";
};

const statusBadge = {
  Open: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Partially Paid": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Overdue: "bg-red-500/15 text-red-300 border-red-500/30",
};

const emptyInvoiceForm = {
  proformaId: "",
  invoiceNo: "",
  quickbooksRef: "",
  client: "",
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  total: "",
  notes: "",
};

const emptyPaymentForm = {
  date: new Date().toISOString().split("T")[0],
  amount: "",
  method: "Bank Transfer",
  reference: "",
};

const extractList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizeProforma = (pi) => ({
  id: Number(pi.id || 0),
  piNo: pi.pi_no || pi.piNo || pi.invoice_no || pi.invoiceNo || `PI-${pi.id}`,
  client: pi.client || pi.client_name || pi.clientName || "",
  total: Number(pi.total || 0),
});

const normalizePayment = (payment) => ({
  id: Number(payment.id || 0),
  date: payment.date || payment.paid_at || payment.created_at || "",
  amount: Number(payment.amount || payment.paid_amount || 0),
  method: payment.method || payment.payment_method || "",
  reference: payment.reference || payment.transaction_ref || "",
});

const normalizeInvoice = (invoice) => {
  const payments = Array.isArray(invoice.payments)
    ? invoice.payments.map(normalizePayment)
    : [];
  const paidFromApi =
    invoice.paid ?? invoice.paidAmount ?? invoice.paid_amount ?? null;
  const paid =
    paidFromApi !== null
      ? Number(paidFromApi || 0)
      : payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const proforma = invoice.proformaInvoice || invoice.proforma_invoice || null;

  return {
    id: Number(invoice.id || 0),
    proformaId:
      Number(invoice.proformaInvoiceId || invoice.proforma_invoice_id || 0) ||
      null,
    proformaNo:
      invoice.proformaNo ||
      invoice.proforma_no ||
      proforma?.piNo ||
      proforma?.pi_no ||
      "",
    invoiceNo: invoice.invoiceNo || invoice.invoice_no || `INV-${invoice.id}`,
    quickbooksRef: invoice.quickbooksRef || invoice.quickbooks_ref || "",
    client:
      invoice.client ||
      invoice.client_name ||
      invoice.clientName ||
      proforma?.client ||
      "",
    issueDate: invoice.issueDate || invoice.issue_date || invoice.date || "",
    dueDate: invoice.dueDate || invoice.due_date || "",
    total: Number(invoice.total || 0),
    paid,
    notes: invoice.notes || "",
    payments,
  };
};

const extractSingle = (payload) => payload?.invoice || payload?.data || payload;

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isViewPaymentsModalOpen, setIsViewPaymentsModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedInvoicePayments, setSelectedInvoicePayments] = useState([]);
  const [viewPaymentsInvoiceId, setViewPaymentsInvoiceId] = useState(null);
  const [viewPaymentsInvoiceNo, setViewPaymentsInvoiceNo] = useState("");
  const [viewPayments, setViewPayments] = useState([]);
  const [isViewPaymentsLoading, setIsViewPaymentsLoading] = useState(false);
  const [viewPaymentsError, setViewPaymentsError] = useState("");
  const [paymentBalance, setPaymentBalance] = useState(0);
  const [paymentModalInvoiceNo, setPaymentModalInvoiceNo] = useState("");
  const [paymentLoadError, setPaymentLoadError] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadInvoices = async () => {
    const response = await apiFetch("/invoices");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to fetch invoices.");
    }
    setInvoices(
      extractList(payload, ["invoices", "invoice", "items"]).map(
        normalizeInvoice,
      ),
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [proformaRes, invoiceRes] = await Promise.all([
          apiFetch("/proforma-invoices"),
          apiFetch("/invoices"),
        ]);

        const [proformaPayload, invoicePayload] = await Promise.all([
          proformaRes.json().catch(() => ({})),
          invoiceRes.json().catch(() => ({})),
        ]);

        if (!proformaRes.ok) {
          throw new Error(
            proformaPayload?.message || "Unable to fetch proforma invoices.",
          );
        }
        if (!invoiceRes.ok) {
          throw new Error(
            invoicePayload?.message || "Unable to fetch invoices.",
          );
        }

        setProformas(
          extractList(proformaPayload, [
            "proformaInvoices",
            "proforma_invoices",
            "invoices",
          ]).map(normalizeProforma),
        );
        setInvoices(
          extractList(invoicePayload, ["invoices", "invoice", "items"]).map(
            normalizeInvoice,
          ),
        );
      } catch {
        setErrorMessage("Failed to load invoices data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const enrichedInvoices = useMemo(
    () =>
      invoices.map((invoice) => {
        const balance = Math.max(
          Number(invoice.total || 0) - Number(invoice.paid || 0),
          0,
        );
        return {
          ...invoice,
          balance,
          status: calcStatus(invoice),
        };
      }),
    [invoices],
  );

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return enrichedInvoices.filter((invoice) => {
      const matchesSearch =
        !query ||
        String(invoice.invoiceNo).toLowerCase().includes(query) ||
        String(invoice.quickbooksRef).toLowerCase().includes(query) ||
        String(invoice.client).toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enrichedInvoices, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = enrichedInvoices.reduce((sum, item) => sum + item.total, 0);
    const paid = enrichedInvoices.reduce((sum, item) => sum + item.paid, 0);
    const open = enrichedInvoices.filter(
      (item) => item.status !== "Paid",
    ).length;
    const overdue = enrichedInvoices.filter(
      (item) => item.status === "Overdue",
    ).length;
    return { total, paid, open, overdue, balance: Math.max(total - paid, 0) };
  }, [enrichedInvoices]);

  const selectedInvoice = useMemo(
    () =>
      enrichedInvoices.find((item) => item.id === selectedInvoiceId) || null,
    [enrichedInvoices, selectedInvoiceId],
  );

  const setInvoiceField = (field, value) =>
    setInvoiceForm((current) => ({ ...current, [field]: value }));

  const handleProformaSelect = (value) => {
    const selected = proformas.find((pi) => String(pi.id) === String(value));
    setInvoiceForm((current) => ({
      ...current,
      proformaId: value,
      client: selected?.client || current.client,
      total:
        selected && Number(selected.total || 0) > 0
          ? String(selected.total)
          : current.total,
    }));
  };

  const setPaymentField = (field, value) =>
    setPaymentForm((current) => ({ ...current, [field]: value }));

  const fetchInvoicePayments = async (invoiceId) => {
    const response = await apiFetch(`/invoices/${invoiceId}/payments`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to fetch invoice payments.");
    }

    return extractList(payload, [
      "payments",
      "invoicePayments",
      "invoice_payments",
    ]).map(normalizePayment);
  };

  const openAddInvoice = () => {
    setEditingInvoiceId(null);
    setInvoiceForm(emptyInvoiceForm);
    setIsInvoiceModalOpen(true);
  };

  const openEditInvoice = async (invoiceId) => {
    setIsSaving(true);
    try {
      const response = await apiFetch(`/invoices/${invoiceId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load invoice details.");
      }

      const invoice = normalizeInvoice(extractSingle(payload));
      setEditingInvoiceId(invoice.id);
      setInvoiceForm({
        proformaId: invoice.proformaId ? String(invoice.proformaId) : "",
        invoiceNo: invoice.invoiceNo || "",
        quickbooksRef: invoice.quickbooksRef || "",
        client: invoice.client || "",
        issueDate: invoice.issueDate
          ? String(invoice.issueDate).split("T")[0]
          : new Date().toISOString().split("T")[0],
        dueDate: invoice.dueDate ? String(invoice.dueDate).split("T")[0] : "",
        total: String(invoice.total || ""),
        notes: invoice.notes || "",
      });
      setIsInvoiceModalOpen(true);
    } catch (error) {
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to load invoice details.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveInvoice = async () => {
    const total = Number(invoiceForm.total || 0);
    if (!invoiceForm.invoiceNo || !invoiceForm.client || total <= 0) {
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Invoice number, client, and total amount are required.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        proformaInvoiceId: invoiceForm.proformaId
          ? Number(invoiceForm.proformaId)
          : null,
        invoiceNo: invoiceForm.invoiceNo.trim(),
        quickbooksRef: invoiceForm.quickbooksRef.trim(),
        client: invoiceForm.client.trim(),
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate || null,
        total,
        notes: invoiceForm.notes.trim() || null,
      };

      const response = editingInvoiceId
        ? await apiFetch(`/invoices/${editingInvoiceId}`, {
            method: "PUT",
            body: payload,
          })
        : await apiFetch("/invoices", {
            method: "POST",
            body: payload,
          });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          responsePayload?.message ||
            (editingInvoiceId
              ? "Unable to update invoice."
              : "Unable to create invoice."),
        );
      }

      await loadInvoices();
      setIsInvoiceModalOpen(false);
      setEditingInvoiceId(null);

      await Swal.fire({
        title: editingInvoiceId ? "Invoice Updated" : "Invoice Captured",
        text: editingInvoiceId
          ? "Invoice updated successfully."
          : "Invoice has been captured for payment tracking.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save invoice.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteInvoice = async (invoiceId) => {
    const confirmation = await Swal.fire({
      title: "Delete invoice?",
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

    setIsSaving(true);
    try {
      const response = await apiFetch(`/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete invoice.");
      }

      await loadInvoices();
      await Swal.fire({
        title: "Deleted",
        text: "Invoice deleted successfully.",
        icon: "success",
        timer: 1400,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete invoice.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openRecordPayment = async (invoiceId) => {
    const invoice =
      enrichedInvoices.find((item) => item.id === invoiceId) || null;
    if (!invoice) return;

    setSelectedInvoiceId(invoiceId);
    setPaymentModalInvoiceNo(invoice.invoiceNo || "");
    setPaymentBalance(Number(invoice.balance || 0));
    setSelectedInvoicePayments(invoice.payments || []);
    setPaymentLoadError("");
    setPaymentForm({
      ...emptyPaymentForm,
      amount: String(Number(invoice.balance || 0) || ""),
    });
    setIsPaymentModalOpen(true);

    setIsPaymentLoading(true);
    try {
      const fetchedPayments = await fetchInvoicePayments(invoiceId);

      const fetchedPaid = fetchedPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );
      const balanceFromFetched = Math.max(
        Number(invoice.total || 0) - fetchedPaid,
        0,
      );

      setSelectedInvoicePayments(fetchedPayments);
      setPaymentBalance(balanceFromFetched);
      setPaymentForm((current) => ({
        ...current,
        amount: String(balanceFromFetched || ""),
      }));
    } catch (error) {
      setPaymentLoadError(error.message || "Unable to load payment history.");
      // Keep modal usable with existing invoice summary if payments endpoint fails.
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const openViewPayments = async (invoiceId) => {
    const invoice =
      enrichedInvoices.find((item) => item.id === invoiceId) || null;
    if (!invoice) return;

    setViewPaymentsInvoiceId(invoiceId);
    setViewPaymentsInvoiceNo(invoice.invoiceNo || "");
    setViewPayments(invoice.payments || []);
    setViewPaymentsError("");
    setIsViewPaymentsModalOpen(true);

    setIsViewPaymentsLoading(true);
    try {
      const fetchedPayments = await fetchInvoicePayments(invoiceId);
      setViewPayments(fetchedPayments);
    } catch (error) {
      setViewPaymentsError(error.message || "Unable to load payment history.");
    } finally {
      setIsViewPaymentsLoading(false);
    }
  };

  const savePayment = async () => {
    if (!selectedInvoice) return;

    const amount = Number(paymentForm.amount || 0);
    if (amount <= 0) {
      await Swal.fire({
        title: "Invalid Amount",
        text: "Please enter a payment amount greater than 0.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (amount > paymentBalance) {
      await Swal.fire({
        title: "Amount Too High",
        text: `Remaining balance is ${formatCurrency(paymentBalance)}.`,
        icon: "info",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    const payment = {
      date: paymentForm.date,
      amount,
      method: paymentForm.method,
      reference: paymentForm.reference.trim() || null,
    };

    setIsSaving(true);
    try {
      const response = await apiFetch(
        `/invoices/${selectedInvoice.id}/payments`,
        {
          method: "POST",
          body: payment,
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to record payment.");
      }

      await loadInvoices();
      setIsPaymentModalOpen(false);

      await Swal.fire({
        title: "Payment Recorded",
        text: "Invoice payment has been captured successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      await Swal.fire({
        title: "Payment Failed",
        text: error.message || "Unable to record payment.",
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
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-slate-400 mt-1">
            Capture QuickBooks invoices and track payments received.
          </p>
        </div>
        <button
          onClick={openAddInvoice}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          Capture Invoice
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Invoice Value</p>
          <p className="text-xl font-bold text-white mt-1">
            {formatCurrency(stats.total)}
          </p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Paid</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {formatCurrency(stats.paid)}
          </p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Outstanding</p>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {formatCurrency(stats.balance)}
          </p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Open</p>
          <p className="text-2xl font-bold text-blue-300 mt-1">{stats.open}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Overdue</p>
          <p className="text-2xl font-bold text-red-300 mt-1">
            {stats.overdue}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search invoice #, QB ref, or client"
              className="w-full bg-transparent outline-none text-sm text-slate-300 placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {["All", "Open", "Partially Paid", "Paid", "Overdue"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-amber-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {[
                  "Invoice",
                  "Proforma",
                  "Client",
                  "Dates",
                  "Total",
                  "Paid",
                  "Balance",
                  "Status",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {invoice.invoiceNo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {invoice.quickbooksRef || "No QB ref"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-300">
                    {invoice.proformaNo || "-"}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-300">
                    {invoice.client}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    <p>Issued: {formatDate(invoice.issueDate)}</p>
                    <p>Due: {formatDate(invoice.dueDate)}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="py-3 px-4 text-sm text-emerald-300">
                    {formatCurrency(invoice.paid)}
                  </td>
                  <td className="py-3 px-4 text-sm text-amber-300">
                    {formatCurrency(invoice.balance)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${statusBadge[invoice.status] || statusBadge.Open}`}
                    >
                      {invoice.status === "Paid" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : invoice.status === "Overdue" ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openRecordPayment(invoice.id)}
                        disabled={invoice.balance <= 0 || isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        Pay
                      </button>
                      <button
                        onClick={() => openViewPayments(invoice.id)}
                        disabled={isSaving}
                        className="p-2 rounded-lg text-slate-300 hover:text-blue-300 hover:bg-slate-800 disabled:opacity-50"
                        title="View Payments"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditInvoice(invoice.id)}
                        disabled={isSaving}
                        className="p-2 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-slate-800 disabled:opacity-50"
                        title="Edit Invoice"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteInvoice(invoice.id)}
                        disabled={isSaving}
                        className="p-2 rounded-lg text-slate-300 hover:text-red-300 hover:bg-slate-800 disabled:opacity-50"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    Loading invoices...
                  </td>
                </tr>
              )}
              {!isLoading && filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsInvoiceModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {editingInvoiceId ? "Edit Invoice" : "Capture Invoice"}
              </h2>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-300 mb-1.5">
                  Linked Proforma Invoice
                </label>
                <select
                  value={invoiceForm.proformaId}
                  onChange={(e) => handleProformaSelect(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                >
                  <option value="">Select proforma invoice (optional)</option>
                  {proformas.map((pi) => (
                    <option key={pi.id} value={pi.id}>
                      {pi.piNo} - {pi.client || "Unknown Client"} (
                      {formatCurrency(pi.total)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Invoice Number *
                </label>
                <input
                  value={invoiceForm.invoiceNo}
                  onChange={(e) => setInvoiceField("invoiceNo", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  QuickBooks Ref
                </label>
                <input
                  value={invoiceForm.quickbooksRef}
                  onChange={(e) =>
                    setInvoiceField("quickbooksRef", e.target.value)
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-300 mb-1.5">
                  Client *
                </label>
                <input
                  value={invoiceForm.client}
                  onChange={(e) => setInvoiceField("client", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(e) => setInvoiceField("issueDate", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceField("dueDate", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Total Amount *
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.total}
                  onChange={(e) => setInvoiceField("total", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceField("notes", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={saveInvoice}
                disabled={isSaving}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : editingInvoiceId ? (
                  "Update Invoice"
                ) : (
                  "Save Invoice"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsPaymentModalOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Record Payment
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {paymentModalInvoiceNo || selectedInvoice.invoiceNo} · Balance{" "}
                  {formatCurrency(paymentBalance)}
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 rounded-lg bg-slate-800/60 border border-slate-700/60 px-3 py-2 text-xs text-slate-300">
                {isPaymentLoading
                  ? "Loading payments..."
                  : `Loaded ${selectedInvoicePayments.length} payment(s) for this invoice. Current balance: ${formatCurrency(paymentBalance)}`}
              </div>
              {!isPaymentLoading && paymentLoadError && (
                <div className="md:col-span-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                  {paymentLoadError}
                </div>
              )}
              {!isPaymentLoading && (
                <div className="md:col-span-2 rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
                  <p className="text-xs font-semibold text-slate-300 mb-2">
                    Payment History
                  </p>
                  {selectedInvoicePayments.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No payments recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedInvoicePayments.map((payment) => (
                        <div
                          key={
                            payment.id ||
                            `${payment.date}-${payment.amount}-${payment.reference}`
                          }
                          className="flex items-center justify-between gap-3 rounded-md bg-slate-900/60 px-2.5 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="text-slate-200 truncate">
                              {formatDate(payment.date)} ·{" "}
                              {payment.method || "Method"}
                            </p>
                            <p className="text-slate-500 truncate">
                              Ref: {payment.reference || "-"}
                            </p>
                          </div>
                          <p className="text-emerald-300 font-medium whitespace-nowrap">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentField("date", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Amount *
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentField("amount", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentField("method", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                >
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Mobile Money</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Reference
                </label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentField("reference", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={savePayment}
                disabled={isSaving}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewPaymentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsViewPaymentsModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Invoice Payments
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {viewPaymentsInvoiceNo ||
                    (viewPaymentsInvoiceId
                      ? `Invoice #${viewPaymentsInvoiceId}`
                      : "")}
                </p>
              </div>
              <button
                onClick={() => setIsViewPaymentsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {isViewPaymentsLoading && (
                <div className="text-sm text-slate-400">
                  Loading payments...
                </div>
              )}

              {!isViewPaymentsLoading && viewPaymentsError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                  {viewPaymentsError}
                </div>
              )}

              {!isViewPaymentsLoading &&
                !viewPaymentsError &&
                viewPayments.length === 0 && (
                  <div className="text-sm text-slate-500">
                    No payments recorded for this invoice.
                  </div>
                )}

              {!isViewPaymentsLoading && viewPayments.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {viewPayments.map((payment) => (
                    <div
                      key={
                        payment.id ||
                        `${payment.date}-${payment.amount}-${payment.reference}`
                      }
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">
                          {formatDate(payment.date)} ·{" "}
                          {payment.method || "Method"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          Ref: {payment.reference || "-"}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-emerald-300 whitespace-nowrap">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsViewPaymentsModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
