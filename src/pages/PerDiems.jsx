import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, Filter, Loader2, RefreshCw, Search, X } from "lucide-react";
import { apiFetch } from "../utils/api";

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PerDiems() {
  const [params, setParams] = useSearchParams();
  const jobCardId = params.get("jobCardId");
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [reload, setReload] = useState(0);
  const [viewJobCard, setViewJobCard] = useState(null);

  useEffect(() => {
    const closeEmbeddedJobCard = (event) => {
      if (event.origin === window.location.origin && event.data?.type === "close-jobcard-view") setViewJobCard(null);
    };
    window.addEventListener("message", closeEmbeddedJobCard);
    return () => window.removeEventListener("message", closeEmbeddedJobCard);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ confirmedOnly: "1" });
    if (jobCardId) query.set("jobCardId", jobCardId);
    apiFetch(`/per-diems?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load per diems.");
        if (!controller.signal.aborted) setVouchers(data.perDiems || []);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobCardId, reload]);

  const records = useMemo(() => vouchers.map((voucher) => {
    const payments = voucher.payments || [];
    const paid = payments.filter((payment) => payment.status === "paid");
    const hasPending = payments.some((payment) => !["paid", "rejected"].includes(payment.status));
    return {
      ...voucher,
      paidAmount: paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      paidDate: paid.map((payment) => payment.paidAt).filter(Boolean).sort().at(-1) || null,
      paymentStatus: paid.length ? (hasPending ? "Partially paid" : "Paid in full")
        : payments.some((payment) => payment.status === "exported") ? "Uploaded to bank"
          : payments.some((payment) => payment.status === "approved") ? "Waiting payment"
            : hasPending ? "Waiting approval" : "Declined",
    };
  }), [vouchers]);

  const filtered = useMemo(() => records.filter((voucher) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [voucher.number, voucher.jobCardNo, voucher.driverName, voucher.groupName, voucher.clientName]
      .some((value) => String(value || "").toLowerCase().includes(query));
    const scheduledDate = String(voucher.generatedAt || "").slice(0, 10);
    return matchesSearch && (!dateFrom || scheduledDate >= dateFrom) && (!dateTo || scheduledDate <= dateTo);
  }), [records, search, dateFrom, dateTo]);

  const download = async (voucher) => {
    setDownloading(voucher.id);
    setError("");
    try {
      const response = await apiFetch(`/per-diems/${voucher.id}/pdf`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download per diem PDF.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${voucher.number}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Confirmed Per Diems</h1><p className="mt-1 text-sm text-slate-600">Per diem vouchers and payment status after bank-side confirmation.</p>
          {jobCardId && <button type="button" onClick={() => setParams({})} className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-800">Showing one job card · Show all per diems</button>}
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button><Link to="/job-cards" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Back to Job Cards</Link></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["Per diem requests", records.length], ["Waiting approval", records.filter((voucher) => voucher.paymentStatus === "Waiting approval").length], ["With confirmed payment", records.filter((voucher) => voucher.paidAmount > 0).length]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Filter className="h-4 w-4 text-amber-600" /> Find a per diem</div>
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_170px_170px_auto]">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Search per diems" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Voucher, job card, driver or client..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-amber-500" /></div>
          <input type="date" aria-label="Scheduled from" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-500" />
          <input type="date" aria-label="Scheduled to" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-500" />
          <button type="button" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }} title="Clear filters" className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Dates filter by the scheduled per diem date.</p>
      </section>

      {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Per diem vouchers</h2><p className="mt-0.5 text-xs text-slate-500">Download a voucher PDF when payment has been confirmed.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{filtered.length} voucher{filtered.length === 1 ? "" : "s"}</span></div>
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr>{["Per Diem", "Job Card", "Driver", "Safari Dates", "Scheduled", "Allowance", "Amount Paid", "Status"].map((label) => <th key={label} className="whitespace-nowrap p-4">{label}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="p-8 text-center">Loading per diems...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">{search || dateFrom || dateTo ? "No matching per diems." : "No per diem requests found."}</td></tr>
                : filtered.map((voucher) => <tr key={voucher.id} className="border-t border-slate-100 hover:bg-amber-50/40">
                  <td className="whitespace-nowrap p-3">{voucher.paidAmount > 0 ? <button type="button" onClick={() => download(voucher)} disabled={downloading !== null} className="inline-flex items-center gap-2 font-semibold text-amber-700 hover:text-amber-900 hover:underline disabled:opacity-50" title={`Download ${voucher.number} PDF`}>{downloading === voucher.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{voucher.number}</button> : <span className="font-semibold text-slate-800">{voucher.number}</span>}</td>
                  <td className="whitespace-nowrap p-3">{voucher.jobCardId && voucher.jobCardNo ? <button type="button" onClick={() => setViewJobCard(voucher.jobCardId)} className="font-medium text-blue-700 hover:underline">{voucher.jobCardNo}</button> : "—"}</td>
                  <td className="p-3">{voucher.driverName || "—"}</td>
                  <td className="whitespace-nowrap p-3 text-slate-600">{voucher.safariStartDate || "—"} <span className="text-slate-400">to</span> {voucher.safariEndDate || "—"}</td>
                  <td className="whitespace-nowrap p-3">{voucher.generatedAt ? new Date(voucher.generatedAt).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="whitespace-nowrap p-3 text-right">{money(voucher.total)}</td>
                  <td className="whitespace-nowrap p-3 text-right font-semibold">{money(voucher.paidAmount)}</td>
                  <td className="whitespace-nowrap p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${voucher.paymentStatus === "Paid in full" ? "bg-emerald-50 text-emerald-700" : voucher.paymentStatus === "Partially paid" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{voucher.paymentStatus}</span></td>
                </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && <p className="text-sm text-slate-500">Showing {filtered.length} per diem{filtered.length === 1 ? "" : "s"}</p>}
      {viewJobCard && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Full job card view" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewJobCard(null); }}><div className="relative h-[96vh] w-full max-w-[1500px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"><button type="button" onClick={() => setViewJobCard(null)} className="absolute right-4 top-4 z-10 rounded-lg border border-red-700 bg-red-600 p-2 text-white shadow-sm transition hover:bg-red-700" aria-label="Close job card details"><X className="h-5 w-5" /></button><iframe title="Full job card details" src={`/job-cards?view=${encodeURIComponent(viewJobCard)}&embed=1`} className="h-full w-full border-0" /></div></div>}
    </div>
  );
}
