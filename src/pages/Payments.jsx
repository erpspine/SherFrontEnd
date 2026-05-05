import { useEffect, useMemo, useState } from "react";
import { Search, Wallet, Calendar, Building2, FileText } from "lucide-react";
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

const extractList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizePayment = (payment) => ({
  id: Number(payment.id || 0),
  invoiceId: Number(payment.invoiceId || payment.invoice_id || 0),
  invoiceNo:
    payment.invoice?.invoiceNo ||
    payment.invoice?.invoice_no ||
    payment.invoiceNo ||
    "-",
  client:
    payment.invoice?.client ||
    payment.invoice?.client_name ||
    payment.client ||
    "-",
  date:
    payment.date ||
    payment.paid_at ||
    payment.createdAt ||
    payment.created_at ||
    "",
  amount: Number(payment.amount || 0),
  method: payment.method || payment.payment_method || "-",
  reference: payment.reference || payment.transaction_ref || "-",
  notes: payment.notes || "",
});

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadPayments = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await apiFetch("/invoice-payments");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to fetch invoice payments.",
          );
        }

        setPayments(
          extractList(payload, [
            "payments",
            "invoicePayments",
            "invoice_payments",
          ]).map(normalizePayment),
        );
      } catch (error) {
        setErrorMessage(error.message || "Failed to load payments.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return payments;

    return payments.filter((payment) => {
      return (
        String(payment.id).toLowerCase().includes(query) ||
        String(payment.invoiceNo).toLowerCase().includes(query) ||
        String(payment.client).toLowerCase().includes(query) ||
        String(payment.method).toLowerCase().includes(query) ||
        String(payment.reference).toLowerCase().includes(query)
      );
    });
  }, [payments, searchTerm]);

  const stats = useMemo(() => {
    const totalAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );
    const todayKey = new Date().toISOString().split("T")[0];
    const todayAmount = payments
      .filter((payment) => String(payment.date).startsWith(todayKey))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const uniqueInvoices = new Set(payments.map((payment) => payment.invoiceId))
      .size;

    return {
      count: payments.length,
      totalAmount,
      todayAmount,
      uniqueInvoices,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-1">
            All invoice payments from <code>/api/invoice-payments</code>.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Total Payments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.count}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Collected Amount</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatCurrency(stats.totalAmount)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Today</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {formatCurrency(stats.todayAmount)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Invoices Paid</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {stats.uniqueInvoices}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-amber-500 transition-colors">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by payment ID, invoice #, client, method, or reference"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
          />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {[
                  "Payment ID",
                  "Invoice",
                  "Client",
                  "Date",
                  "Amount",
                  "Method",
                  "Reference",
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    Loading payments...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-slate-700 font-mono">
                      #{payment.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        {payment.invoiceNo}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {payment.client}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(payment.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-emerald-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-slate-400" />
                        {payment.method}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {payment.reference || "-"}
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
