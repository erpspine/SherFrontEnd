import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Receipt,
  Building2,
  Eye,
  Download,
  X,
  FileText,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const statusConfig = {
  Draft: {
    color: "bg-slate-500/20 text-slate-600 border-slate-500/30",
    icon: Clock,
  },
  Sent: {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Send,
  },
  Paid: {
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle,
  },
  Overdue: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: AlertTriangle,
  },
  Converted: {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Receipt,
  },
};

const formatCurrency = (n) => `USD ${Number(n || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const addDays = (value, days) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().split("T")[0];
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.proformaInvoices)) return payload.proformaInvoices;
  if (Array.isArray(payload?.proforma_invoices))
    return payload.proforma_invoices;
  if (Array.isArray(payload?.invoices)) return payload.invoices;
  return [];
};

const normalizePI = (pi) => {
  const quotationId = pi.quotation_id || pi.quotationId || null;
  const quoteRef =
    pi.quote_ref ||
    pi.quoteRef ||
    pi.quotation_no ||
    pi.quotationNo ||
    (quotationId ? `QT-${quotationId}` : "-");
  const quoteDate =
    pi.quoteDate ||
    pi.quote_date ||
    pi.date ||
    pi.invoice_date ||
    pi.invoiceDate ||
    pi.createdAt ||
    pi.created_at ||
    "";
  const dueDate =
    pi.due_date || pi.dueDate || (quoteDate ? addDays(quoteDate, 14) : "");

  return {
    id: pi.id,
    quotationId,
    leadId: pi.lead_id || pi.leadId || null,
    piNo: pi.pi_no || pi.piNo || pi.invoice_no || pi.invoiceNo || `PI-${pi.id}`,
    quoteRef,
    date: quoteDate,
    dueDate,
    client: pi.client || pi.client_name || pi.clientName || "",
    attention: pi.attention || "",
    notes: pi.notes || "",
    serviceSummary:
      pi.service_summary ||
      pi.serviceSummary ||
      pi.description ||
      pi.notes ||
      "Service",
    daySections: Array.isArray(pi.day_sections)
      ? pi.day_sections
      : Array.isArray(pi.daySections)
        ? pi.daySections
        : [],
    lineItems: Array.isArray(pi.line_items)
      ? pi.line_items.map((item) => ({
          ...item,
          qty: Number(item.qty || 0),
          rate: Number(item.rate || 0),
          total: Number(item.total || 0),
        }))
      : Array.isArray(pi.lineItems)
        ? pi.lineItems.map((item) => ({
            ...item,
            qty: Number(item.qty || 0),
            rate: Number(item.rate || 0),
            total: Number(item.total || 0),
          }))
        : [],
    subtotal: Number(pi.subtotal || 0),
    tax: Number(pi.tax || 0),
    total: Number(pi.total || 0),
    status: pi.status || "Converted",
  };
};

const extractSingle = (payload) =>
  payload?.data ||
  payload?.proformaInvoice ||
  payload?.proforma_invoice ||
  payload;

export default function ProformaInvoices() {
  const [allPIs, setAllPIs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewPI, setViewPI] = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [downloadingPiId, setDownloadingPiId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const loadPIs = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/proforma-invoices");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to fetch proforma invoices.",
        );
      }

      setAllPIs(extractList(payload).map(normalizePI));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load proforma invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPIs();
  }, []);

  const stats = useMemo(
    () => ({
      total: allPIs.length,
      converted: allPIs.filter((pi) => pi.status === "Converted").length,
      totalAmount: allPIs.reduce((sum, pi) => sum + Number(pi.total || 0), 0),
    }),
    [allPIs],
  );

  const statusOptions = useMemo(
    () => [
      "All",
      ...Array.from(new Set(allPIs.map((pi) => pi.status).filter(Boolean))),
    ],
    [allPIs],
  );

  const filtered = useMemo(
    () =>
      allPIs.filter((pi) => {
        const query = searchTerm.toLowerCase();
        const matchSearch =
          pi.piNo.toLowerCase().includes(query) ||
          pi.client.toLowerCase().includes(query) ||
          pi.quoteRef.toLowerCase().includes(query);
        const matchStatus =
          statusFilter === "All" || pi.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [allPIs, searchTerm, statusFilter],
  );

  const handleDownloadPdf = async (pi) => {
    setDownloadingPiId(pi.id);

    try {
      const response = await apiFetch(`/proforma-invoices/${pi.id}/pdf`);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${pi.piNo}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      await Swal.fire({
        title: "PDF Failed",
        text: error.message || "Failed to download PDF.",
        icon: "error",
        background: "#ffffff",
        color: "#111827",
      });
    } finally {
      setDownloadingPiId(null);
    }
  };

  const handleViewPI = async (pi) => {
    setIsViewLoading(true);
    try {
      const response = await apiFetch(`/proforma-invoices/${pi.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch PI details.");
      }

      setViewPI(normalizePI(extractSingle(payload)));
    } catch (error) {
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to fetch PI details.",
        icon: "error",
        background: "#ffffff",
        color: "#111827",
      });
    } finally {
      setIsViewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Proforma Invoices</h1>
          <p className="text-slate-400 mt-1">
            Manage and track proforma invoices.
          </p>
        </div>
        <button
          onClick={() => navigate("/quotations")}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <FileText className="w-4 h-4" />
          Go To Quotations
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total PI Value</p>
          <p className="text-xl font-bold text-white mt-1">
            {formatCurrency(stats.totalAmount)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{stats.total} invoices</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Converted</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">
            {stats.converted}
          </p>
          <p className="text-xs text-slate-500 mt-1">from quotations</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Average PI</p>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {formatCurrency(stats.total ? stats.totalAmount / stats.total : 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">per invoice</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by PI #, quote ref, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none text-sm text-slate-300 placeholder-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-amber-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {[
                  "PI #",
                  "Quote Ref",
                  "Date",
                  "Due Date",
                  "Client",
                  "Service Summary",
                  "Total",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pi) => {
                const sc = statusConfig[pi.status] || statusConfig.Converted;
                return (
                  <tr
                    key={pi.id}
                    className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-white font-medium text-sm">
                          {pi.piNo}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-amber-300">
                      {pi.quoteRef}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {formatDate(pi.date)}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-300 whitespace-nowrap">
                      {formatDate(pi.dueDate)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-300 whitespace-nowrap">
                          {pi.client}
                        </span>
                      </div>
                    </td>
                    <td
                      className="py-4 px-4 text-sm text-slate-300 max-w-sm truncate"
                      title={pi.serviceSummary}
                    >
                      {pi.serviceSummary}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-semibold text-sm whitespace-nowrap">
                        {formatCurrency(pi.total)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${sc.color}`}
                      >
                        <sc.icon className="w-3 h-3" />
                        {pi.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewPI(pi)}
                          disabled={isViewLoading}
                          className="p-1.5 text-slate-300 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(pi)}
                          disabled={downloadingPiId === pi.id}
                          className="p-1.5 text-slate-300 hover:text-green-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title={
                            downloadingPiId === pi.id
                              ? "Downloading..."
                              : "Download PDF"
                          }
                        >
                          {downloadingPiId === pi.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No proforma invoices found. Convert approved quotations to PI.
            </div>
          )}
          {isLoading && (
            <div className="py-16 text-center text-slate-500">
              Loading proforma invoices...
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {filtered.length} of {allPIs.length} invoices
          </p>
          <p className="text-sm font-semibold text-white">
            Total:{" "}
            {formatCurrency(
              filtered.reduce((s, pi) => s + Number(pi.total || 0), 0),
            )}
          </p>
        </div>
      </div>

      {viewPI && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">{viewPI.piNo}</h2>
                <p className="text-sm text-slate-400">Ref: {viewPI.quoteRef}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(viewPI)}
                  disabled={downloadingPiId === viewPI.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                >
                  {downloadingPiId === viewPI.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingPiId === viewPI.id ? "Downloading..." : "PDF"}
                </button>
                <button
                  onClick={() => setViewPI(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Client</span>
                <span className="text-white font-medium">{viewPI.client}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invoice Date</span>
                <span className="text-slate-300">
                  {formatDate(viewPI.date)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Due Date</span>
                <span className="text-slate-300">
                  {formatDate(viewPI.dueDate)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-300">
                    {formatCurrency(viewPI.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">VAT (18%)</span>
                  <span className="text-slate-300">
                    {formatCurrency(viewPI.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-slate-800 pt-2">
                  <span className="text-white">Total</span>
                  <span className="text-white">
                    {formatCurrency(viewPI.total)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium border ${statusConfig[viewPI.status]?.color || statusConfig.Converted.color}`}
                >
                  {viewPI.status}
                </span>
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => navigate("/quotations")}
                className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
              >
                Open Quotations
              </button>
              <button
                onClick={() => setViewPI(null)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90"
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
