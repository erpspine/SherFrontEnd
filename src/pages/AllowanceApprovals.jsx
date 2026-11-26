import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, RefreshCw, X } from "lucide-react";
import { apiFetch } from "../utils/api";
import { hasPermission } from "../utils/auth";

const money = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const contractLabel = (value) => {
  const type = String(value || "").trim().toLowerCase();
  if (type.includes("freelance")) return "Freelance";
  if (type.includes("long")) return "Long Term";
  if (type.includes("short")) return "Short Term";
  return value ? String(value) : "Contract type not set";
};
const remainingAllowance = (voucher) => Math.max(0, Number(voucher.total || 0) - (voucher.payments || []).filter((payment) => ["approved", "exported", "paid"].includes(payment.status)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
const requestedAllowance = (voucher) => Number(voucher?.total || 0);
const matchesTab = (row, tab) => tab === "draft"
  ? row.status === "draft" && Boolean(row.voucher.requestedForApprovalAt)
  : tab === "approved"
    ? ["approved", "exported"].includes(row.status)
    : row.status === "paid";

export default function AllowanceApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [reload, setReload] = useState(0);
  const [activeTab, setActiveTab] = useState("draft");
  const [dateField, setDateField] = useState("requestedForApprovalAt");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [approvalRows, setApprovalRows] = useState(null);
  const [reviewRows, setReviewRows] = useState(null);
  const [paymentMode, setPaymentMode] = useState("advance");
  const [viewJobCard, setViewJobCard] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const canApprove = hasPermission("job-cards.update");

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
    apiFetch("/per-diems", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load allowance approvals.");
        const pending = (data.perDiems || []).flatMap((voucher) =>
          (voucher.payments || [])
            .filter((payment) => ["draft", "approved", "exported", "paid"].includes(payment.status))
            .map((payment) => ({ ...payment, voucher })),
        );
        if (!controller.signal.aborted) setRows(pending);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const groupedRows = useMemo(() => {
    const groups = new Map();
    const term = search.trim().toLowerCase();
    rows.filter((row) => matchesTab(row, activeTab)).filter((row) => {
      if (!term) return true;
      const searchable = [row.voucher.jobCardNo, row.voucher.clientName, row.voucher.groupName, row.voucher.driverName, row.voucher.number, row.paymentReference, row.stage, row.status]
        .filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(term);
    }).filter((row) => {
      const rawDate = ["paidAt", "approvedAt"].includes(dateField) ? row[dateField] : row.voucher[dateField];
      const value = String(rawDate || "").slice(0, 10);
      return (!dateFrom || value >= dateFrom) && (!dateTo || value <= dateTo);
    }).forEach((row) => {
      const key = row.voucher.id;
      if (!groups.has(key)) groups.set(key, { key, voucher: row.voucher, rows: [] });
      groups.get(key).rows.push(row);
    });
    return [...groups.values()];
  }, [rows, activeTab, dateField, dateFrom, dateTo, search]);

  const openApproval = (group) => {
    setModalError("");
    const visible = group.rows.filter((row) => row.stage !== "balance" || !group.rows.some((other) => other.voucher.id === row.voucher.id && other.stage === "advance"));
    const nextMode = visible.some((row) => row.stage === "advance") ? "advance" : "full";
    setPaymentMode(nextMode);
    setReviewRows(visible.map((row) => ({
      ...row,
      approvalAmount: nextMode === "advance" ? (remainingAllowance(row.voucher) / 2).toFixed(2) : remainingAllowance(row.voucher).toFixed(2),
      reason: "",
    })));
  };

  const approve = async () => {
    if (!reviewRows?.length) return;
    setProcessing(true);
    setModalError("");
    try {
      const response = await apiFetch("/per-diems/approve-payments", {
        method: "POST",
        body: {
          paymentIds: reviewRows.map((row) => row.id),
          approvals: reviewRows.map((row) => ({
            id: row.id,
            amount: Number(row.approvalAmount),
            reason: row.reason || "",
            paymentMode,
          })),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to approve allowance.");
      setReviewRows(null);
      setReload((value) => value + 1);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const reject = async () => {
    if (!reviewRows?.length) return;
    const ids = reviewRows.map((row) => row.id);
    setProcessing(true);
    setModalError("");
    try {
      const response = await apiFetch("/per-diems/approve-payments", {
        method: "POST",
        body: { paymentIds: ids, rejectPaymentIds: ids },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to decline allowance.");
      setReviewRows(null);
      setReload((value) => value + 1);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const amountError = reviewRows?.some((row) => {
    const amount = Number(row.approvalAmount);
    const maximum = remainingAllowance(row.voucher);
    return !Number.isFinite(amount) || amount <= 0 || amount > maximum || (paymentMode === "advance" && amount >= maximum);
  });

  const openJobCard = async (jobCardId) => {
    setViewError("");
    setViewJobCard(jobCardId);
  };

  const detailValue = (value) => value === null || value === undefined || value === "" ? "—" : String(value);
  const reviewVoucher = reviewRows?.[0]?.voucher;
  const reviewItinerary = Array.isArray(reviewVoucher?.items)
    ? reviewVoucher.items
    : Array.isArray(reviewVoucher?.routeItinerary)
      ? reviewVoucher.routeItinerary
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allowance Approvals</h1>
          <p className="mt-1 text-sm text-slate-600">Review job-card allowances before they move to payment.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading || processing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button><Link to="/bank-payment-queue" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Bank Payment Queue</Link></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Allowance payment status">{[["draft", "Waiting Approval", "Scheduled requests"], ["approved", "Waiting Payment", "Approved · proof pending"], ["paid", "Paid", "Payment proof uploaded"]].map(([status, label, subtitle]) => <button type="button" role="tab" aria-selected={activeTab === status} key={status} onClick={() => { setActiveTab(status); setDateField(status === "paid" ? "paidAt" : status === "approved" ? "approvedAt" : "requestedForApprovalAt"); setDateFrom(""); setDateTo(""); }} className={`rounded-xl border px-4 py-3 text-left transition ${activeTab === status ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20" : "border-slate-200 bg-slate-50 text-slate-800 hover:border-amber-300 hover:bg-amber-50"}`}><span className="flex items-center justify-between gap-2 text-sm font-bold"><span className="inline-flex items-center gap-2">{status === "approved" ? <CreditCard className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{label}</span><span className={`rounded-full px-2.5 py-0.5 text-xs ${activeTab === status ? "bg-white/20 text-white" : "bg-white text-slate-700"}`}>{rows.filter((row) => matchesTab(row, status)).length}</span></span><span className={`mt-1 block text-xs ${activeTab === status ? "text-amber-50" : "text-slate-500"}`}>{subtitle}</span></button>)}</div>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-[minmax(170px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] sm:items-end"><label className="text-xs font-semibold text-slate-600">Filter date by<select value={dateField} onChange={(event) => setDateField(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"><option value="requestedForApprovalAt">Scheduled date</option><option value="approvedAt">Approval date</option><option value="generatedAt">Voucher date</option><option value="safariStartDate">Safari start date</option><option value="paidAt">Paid date</option></select></label><label className="text-xs font-semibold text-slate-600">From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800" /></label><label className="text-xs font-semibold text-slate-600">To<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800" /></label><button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear dates</button></div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="block text-xs font-semibold text-slate-600">Search Waiting Payment and Paid lists<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Jobcard, client, driver, voucher, reference..." className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" /></label></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{activeTab === "draft" ? "Awaiting approval" : activeTab === "paid" ? "Paid vouchers" : "Awaiting payment"}</p><p className="mt-1 text-2xl font-bold text-amber-800">{groupedRows.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment lines</p><p className="mt-1 text-2xl font-bold text-slate-900">{groupedRows.reduce((sum, group) => sum + group.rows.length, 0)}</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{activeTab === "draft" ? "Requested" : activeTab === "paid" ? "Paid" : "Approved"} amount</p><p className="mt-1 text-2xl font-bold text-emerald-800">{money(groupedRows.reduce((total, group) => total + (activeTab === "draft" ? requestedAllowance(group.voucher) : group.rows.reduce((sum, row) => sum + Number(row.amount), 0)), 0))} TZS</p></div></div>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">{activeTab === "draft" ? "Scheduled requests" : activeTab === "approved" ? "Approved, awaiting payment" : "Payments with uploaded proof"}</h2><p className="mt-0.5 text-xs text-slate-500">{activeTab === "draft" ? "Review each request and decide the approved amount." : activeTab === "approved" ? "These amounts are approved and still need payment confirmation." : "Payment proof has been uploaded for these records."}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{groupedRows.length} voucher{groupedRows.length === 1 ? "" : "s"}</span></div>
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr><th className="p-4">Jobcard</th><th className="p-4">Client / Group</th><th className="p-4">Safari dates</th><th className="p-4">Driver / Stage</th><th className="p-4 text-right">Requested</th><th className="p-4 text-right">Approved</th><th className="p-4 text-right">Paid / Uploaded</th><th className="p-4">Payment details</th><th className="p-4">Action</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-600" /></td></tr>
            ) : groupedRows.length === 0 ? (
              <tr><td colSpan={9} className="p-10 text-center text-slate-500">No payments in {activeTab === "draft" ? "Waiting Approval" : activeTab === "paid" ? "Paid" : "Waiting Payment"} for the selected dates.</td></tr>
            ) : groupedRows.map((group) => (
              <tr key={group.key} className="border-t border-slate-100 transition-colors hover:bg-amber-50/50">
                <td className="p-4 font-semibold text-slate-900"><button type="button" onClick={() => openJobCard(group.voucher.jobCardId)} className="text-blue-700 hover:underline">{group.voucher.jobCardNo || "—"}</button></td>
                <td className="p-4"><div className="font-medium text-slate-900">{group.voucher.clientName || group.voucher.groupName || "—"}</div><div className="text-xs text-slate-500">{group.voucher.groupName || ""}</div></td>
                <td className="p-4 text-xs">{group.voucher.safariStartDate || "—"}<br />{group.voucher.safariEndDate || "—"}</td>
                <td className="p-4"><div className="space-y-1">{group.rows.map((row) => <div key={row.id}><span className="font-medium">{group.voucher.driverName}</span><span className="ml-2 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{contractLabel(group.voucher.contractType)}</span><span className="ml-2 text-xs capitalize text-slate-500">{row.stage}</span></div>)}</div></td>
                <td className="p-4 text-right font-semibold">{money(requestedAllowance(group.voucher))} TZS</td>
                <td className="p-4 text-right font-semibold text-blue-700">{activeTab === "draft" ? "—" : `${money(group.rows.reduce((total, row) => total + Number(row.amount), 0))} TZS`}</td>
                <td className="p-4 text-right font-semibold text-emerald-700">{activeTab === "paid" ? `${money(group.rows.reduce((total, row) => total + Number(row.amount), 0))} TZS` : "—"}</td>
                <td className="p-4 text-xs text-slate-600">{group.rows.map((row) => <div key={row.id} className="mb-1"><span className={`inline-flex rounded-full px-2 py-1 font-semibold ${row.status === "paid" ? "bg-emerald-50 text-emerald-700" : row.status === "exported" ? "bg-blue-50 text-blue-700" : row.status === "approved" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{row.status === "exported" ? "Bank file created" : row.status === "approved" ? "Approved" : row.status === "paid" ? "Paid" : "Scheduled"}</span>{row.paymentReference && <span className="mt-1 block">Ref: {row.paymentReference}</span>}{row.approvalReason && <span className="mt-1 block text-slate-700"><span className="font-semibold">Reason:</span> {row.approvalReason}</span>}{row.paidAt && <span className="block">Paid: {String(row.paidAt).slice(0, 10)}</span>}{row.paymentProofPath && <span className="block font-semibold text-emerald-700">Proof uploaded</span>}</div>)}</td>
                <td className="p-4">{activeTab === "draft" && canApprove ? <button type="button" onClick={() => openApproval(group)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" /> Review and approve</button> : activeTab === "approved" ? <Link to="/bank-payment-queue" className="text-sm font-semibold text-blue-700 hover:underline">Payment queue</Link> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewJobCard && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Full job card view" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewJobCard(null); }}><div className="relative h-[96vh] w-full max-w-[1500px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"><button type="button" onClick={() => setViewJobCard(null)} className="absolute right-4 top-4 z-10 rounded-lg border border-red-700 bg-red-600 p-2 text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400" aria-label="Close job card details"><X className="h-5 w-5" /></button><iframe title="Full job card details" src={`/job-cards?view=${encodeURIComponent(viewJobCard)}&embed=1`} className="h-full w-full border-0" /></div></div>}
      {reviewRows && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Review allowance">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Review allowance</h2><p className="mt-1 text-sm text-slate-500">Choose how to pay the driver allowance.</p></div><button type="button" onClick={() => setReviewRows(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close review"><X className="h-5 w-5" /></button></div>
          {modalError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{modalError}</div>}
          <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h3 className="text-sm font-bold text-slate-900">Itinerary and allowance breakdown</h3><p className="mt-1 text-xs text-slate-600">{reviewVoucher?.jobCardNo || "Job card"} · {reviewVoucher?.driverName || "Driver"}</p><p className="mt-1 text-xs text-slate-600"><span className="font-semibold text-slate-700">Group Name:</span> {reviewVoucher?.groupName || "—"}</p></div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800">Total: {money(reviewVoucher?.total)} TZS</span>
            </div>
            {reviewItinerary.length ? <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200 bg-white"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-amber-100/70 text-xs uppercase tracking-wide text-amber-900"><tr><th className="px-3 py-2">Date / day</th><th className="px-3 py-2">Itinerary</th><th className="px-3 py-2 text-right">Allowance / day</th></tr></thead><tbody>{reviewItinerary.map((item, index) => { const allowance = item?.allowancePerDay ?? item?.allowance_per_day; return <tr key={`${item?.date || item?.dayDescription || "line"}-${index}`} className="border-t border-amber-100"><td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{item?.date || item?.dayDate || `Day ${index + 1}`}</td><td className="px-3 py-2 text-slate-600">{item?.dayDescription || item?.description || item?.location || "—"}</td><td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-900">{money(allowance)} TZS</td></tr>; })}</tbody></table></div> : <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-500">No itinerary breakdown was saved for this request.</p>}
          </section>
          <label className="mt-5 block text-sm font-semibold text-slate-800">Payment type
            <select value={paymentMode} onChange={(event) => { const mode = event.target.value; setPaymentMode(mode); setModalError(""); setReviewRows((current) => current.map((row) => ({ ...row, approvalAmount: (mode === "advance" ? remainingAllowance(row.voucher) / 2 : remainingAllowance(row.voucher)).toFixed(2) }))); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-amber-500">
              <option value="advance">Advance payment</option><option value="full">Full payment</option>
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-500">{paymentMode === "advance" ? "Starts at 50%. The advance must be less than the full allowance; the remaining balance stays pending." : "Pay the full allowance now, even if the job card is still open."}</p>
          <div className="mt-5 space-y-4">{reviewRows.map((row) => {
            const limit = remainingAllowance(row.voucher);
            return <div key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-slate-900">{row.voucher.driverName} · {contractLabel(row.voucher.contractType)}</span><span className="text-slate-600">Allowance remaining {money(limit)} TZS</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Amount to approve (TZS)<input type="number" min="0.01" max={paymentMode === "advance" ? Math.max(0, limit - 0.01) : limit} step="0.01" value={row.approvalAmount} onChange={(event) => { const typed = event.target.value; const max = paymentMode === "advance" ? Math.max(0, limit - 0.01) : limit; const next = typed === "" ? "" : String(Math.min(Math.max(0, Number(typed) || 0), max)); setReviewRows((current) => current.map((item) => item.id === row.id ? { ...item, approvalAmount: next } : item)); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500" /></label><label className="text-sm font-medium text-slate-700">Reason (optional)<input value={row.reason} onChange={(event) => setReviewRows((current) => current.map((item) => item.id === row.id ? { ...item, reason: event.target.value } : item))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500" /></label></div><p className="mt-2 text-xs text-slate-600">Balance after approval: {money(Math.max(0, limit - Number(row.approvalAmount || 0)))} TZS</p></div>;
          })}</div>
          {amountError && <p className="mt-3 text-sm font-semibold text-rose-700">Enter an amount above zero{paymentMode === "advance" ? " and below the full allowance" : " and no greater than the allowance"}.</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" onClick={reject} disabled={processing} className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Do not approve</button><div className="flex gap-2"><button type="button" onClick={() => setReviewRows(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">Cancel</button><button type="button" onClick={approve} disabled={processing || amountError} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{processing ? "Approving..." : `Approve ${paymentMode}`}</button></div></div>
        </div>
      </div>}
      {approvalRows && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Review allowance</h2><p className="mt-1 text-sm text-slate-500">Approve the full amount or a smaller amount. Any balance stays pending for later approval.</p></div><button type="button" onClick={() => setApprovalRows(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{modalError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{modalError}</div>}<div className="mt-5 space-y-4">{approvalRows.map((row) => <div key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex justify-between text-sm"><span className="font-semibold text-slate-900">{row.voucher.driverName} · {row.stage}</span><span className="text-slate-500">Allowance limit {money(row.requestedAmount ?? row.amount)}</span></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Approve now<input type="number" min="0.01" max={row.requestedAmount ?? row.amount} step="0.01" value={row.approvalAmount} onChange={(event) => setApprovalRows((current) => current.map((item) => item.id === row.id ? { ...item, approvalAmount: event.target.value } : item))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" /><span className="mt-1 block text-xs text-slate-500">Balance remaining: {money(Math.max(0, Number(row.requestedAmount ?? row.amount) - Number(row.approvalAmount || 0)))}</span></label><label className="text-sm font-medium text-slate-700">Reason (optional)<input value={row.reason} onChange={(event) => setApprovalRows((current) => current.map((item) => item.id === row.id ? { ...item, reason: event.target.value } : item))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" placeholder="Reason for adjustment" /></label></div></div>)}</div>{amountError && <p className="mt-3 text-sm font-medium text-rose-700">Enter an amount above zero and no greater than the allowance value.</p>}<div className="mt-6 flex flex-wrap justify-between gap-2"><button type="button" onClick={reject} disabled={processing} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">{processing ? "Saving..." : "Do not approve"}</button><div className="flex gap-2"><button type="button" onClick={() => setApprovalRows(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Cancel</button><button type="button" onClick={approve} disabled={processing || amountError} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{processing ? "Approving..." : "Approve amount"}</button></div></div></div></div>}
    </div>
  );
}
