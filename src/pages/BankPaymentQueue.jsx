import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Pencil, RefreshCw, UploadCloud, X } from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";
import { hasPermission } from "../utils/auth";

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateOnly = (value) => value ? new Date(value).toLocaleDateString() : "—";

export default function BankPaymentQueue() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [paidSelection, setPaidSelection] = useState(null);
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [editPayment, setEditPayment] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editReason, setEditReason] = useState("");
  const [viewJobCard, setViewJobCard] = useState(null);
  const canManage = hasPermission("job-cards.update");

  useEffect(() => {
    const closeEmbeddedJobCard = (event) => {
      if (event.origin === window.location.origin && event.data?.type === "close-jobcard-view") setViewJobCard(null);
    };
    window.addEventListener("message", closeEmbeddedJobCard);
    return () => window.removeEventListener("message", closeEmbeddedJobCard);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    apiFetch("/per-diems", { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load bank payments.");
      if (!controller.signal.aborted) {
        setRows((data.perDiems || []).flatMap((voucher) => (voucher.payments || [])
          .filter((payment) => ["approved", "exported", "paid"].includes(payment.status))
          .map((payment) => ({ ...payment, voucher }))));
        setSelected([]);
      }
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const tabMatches = activeTab === "paid"
      ? row.status === "paid"
      : ["approved", "exported"].includes(row.status);
    const relevantDate = activeTab === "paid" ? row.paidAt : row.exportedAt;
    const date = String(relevantDate || "").slice(0, 10);
    return tabMatches && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  }), [rows, activeTab, dateFrom, dateTo]);
  const selectedRows = useMemo(() => filteredRows.filter((row) => selected.includes(row.id)), [filteredRows, selected]);
  const approvedRows = selectedRows.filter((row) => row.status === "approved");
  const uploadedRows = selectedRows.filter((row) => row.status === "exported");
  const readyCount = filteredRows.filter((row) => row.status === "approved").length;
  const uploadedCount = filteredRows.filter((row) => row.status === "exported").length;
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectAll = () => setSelected(selectedRows.length === filteredRows.length ? [] : filteredRows.map((row) => row.id));

  const confirmBankUpload = async () => {
    if (!approvedRows.length) return;
    const confirmation = await Swal.fire({
      title: "Confirm bank upload?",
      text: `Confirm that ${approvedRows.length} payment${approvedRows.length === 1 ? " has" : "s have"} been uploaded manually on the Azania Bank side?`,
      icon: "question", showCancelButton: true,
      confirmButtonText: "Yes, confirm upload", cancelButtonText: "Cancel", confirmButtonColor: "#059669",
    });
    if (!confirmation.isConfirmed) return;
    setProcessing(true); setError("");
    try {
      const response = await apiFetch("/per-diems/confirm-bank-upload", { method: "POST", body: { paymentIds: approvedRows.map((row) => row.id) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to confirm bank upload.");
      setReload((value) => value + 1);
      await Swal.fire({ title: "Bank upload confirmed", text: data.message, icon: "success", confirmButtonColor: "#059669" });
    } catch (err) { setError(err.message); } finally { setProcessing(false); }
  };

  const openPaidModal = (payments) => { setError(""); setReference(""); setProof(null); setPaidSelection(payments); };
  const openEditModal = (payment) => {
    setError("");
    setEditPayment(payment);
    setEditAmount(String(payment.amount ?? ""));
    setEditReference(payment.paymentReference || "");
    setEditReason(payment.approvalReason || "");
  };
  const saveEdit = async () => {
    if (!editPayment) return;
    setProcessing(true); setError("");
    try {
      const response = await apiFetch(`/per-diem-payments/${editPayment.id}`, {
        method: "PATCH",
        body: { amount: Number(editAmount), paymentReference: editReference, approvalReason: editReason },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to update payment record.");
      setEditPayment(null); setReload((value) => value + 1);
      await Swal.fire({ title: "Payment updated", text: data.message, icon: "success", confirmButtonColor: "#059669" });
    } catch (err) { setError(err.message); } finally { setProcessing(false); }
  };
  const markBatchPaid = async () => {
    if (!paidSelection?.length) return;
    setProcessing(true); setError("");
    try {
      const body = new FormData();
      paidSelection.forEach((row) => body.append("paymentIds[]", row.id));
      if (reference.trim()) body.append("paymentReference", reference.trim());
      if (proof) body.append("paymentProof", proof);
      const response = await apiFetch("/per-diem-payments/batch-paid", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to mark selected payments as paid.");
      setPaidSelection(null); setReload((value) => value + 1);
      await Swal.fire({ title: "Payments marked paid", text: data.message, icon: "success", confirmButtonColor: "#059669" });
    } catch (err) { setError(err.message); } finally { setProcessing(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Bank Payment Queue</h1><p className="mt-1 text-sm text-slate-600">Confirm payments after they have been uploaded manually on the Azania Bank side.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setReload((value) => value + 1)} disabled={loading || processing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button><Link to="/allowance-approvals" className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Allowance Approvals</Link></div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-amber-500 bg-amber-500 px-4 py-3 text-white shadow-md shadow-amber-500/20"><span className="flex items-center justify-between gap-2 text-sm font-bold"><span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4" /> Ready for bank upload</span><span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">{readyCount}</span></span><span className="mt-1 block text-xs text-amber-50">Approved · select and confirm upload</span></div><div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800"><span className="flex items-center justify-between gap-2 text-sm font-bold"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Uploaded to bank</span><span className="rounded-full bg-white px-2.5 py-0.5 text-xs">{uploadedCount}</span></span><span className="mt-1 block text-xs text-slate-500">Awaiting payment completion</span></div></div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Ready for upload</p><p className="mt-1 text-2xl font-bold text-amber-800">{readyCount}</p></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Uploaded to bank</p><p className="mt-1 text-2xl font-bold text-blue-800">{uploadedCount}</p></div><div className="col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-1"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Waiting payment value</p><p className="mt-1 text-2xl font-bold text-emerald-800">{money(filteredRows.reduce((sum, row) => sum + Number(row.amount), 0))} <span className="text-sm">TZS</span></p></div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Payment status"><button type="button" role="tab" aria-selected={activeTab === "upload"} onClick={() => { setActiveTab("upload"); setDateFrom(""); setDateTo(""); setSelected([]); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${activeTab === "upload" ? "bg-amber-500 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>Confirm Bank Upload ({rows.filter((row) => ["approved", "exported"].includes(row.status)).length})</button><button type="button" role="tab" aria-selected={activeTab === "paid"} onClick={() => { setActiveTab("paid"); setDateFrom(""); setDateTo(""); setSelected([]); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${activeTab === "paid" ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>Paid ({rows.filter((row) => row.status === "paid").length})</button></div><div className="grid gap-3 sm:grid-cols-[minmax(170px,1fr)_minmax(170px,1fr)_auto] sm:items-end"><label className="text-sm font-semibold text-slate-700">From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500" /></label><label className="text-sm font-semibold text-slate-700">To<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500" /></label><button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} disabled={!dateFrom && !dateTo} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Clear dates</button></div><p className="mt-2 text-xs text-slate-500">Filters by {activeTab === "paid" ? "date paid" : "date confirmed"}.</p></div>
    {error && !paidSelection && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">{activeTab === "paid" ? "Paid payments" : "Payments awaiting bank confirmation"}</h2><p className="mt-0.5 text-xs text-slate-500">{activeTab === "paid" ? "Payments completed after bank processing." : "Select approved payments after uploading them manually in Azania Bank."}</p></div>{activeTab === "upload" && <div className="flex flex-wrap gap-2"><button type="button" onClick={confirmBankUpload} disabled={!canManage || !approvedRows.length || processing} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><UploadCloud className="h-4 w-4" /> Confirm bank upload ({approvedRows.length})</button><button type="button" onClick={() => openPaidModal(uploadedRows)} disabled={!canManage || !uploadedRows.length || processing} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-50">Mark paid ({uploadedRows.length})</button></div>}</div>
      <table className="w-full text-left text-sm text-slate-700"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr><th className="p-4">{activeTab === "paid" ? "" : <input type="checkbox" className="h-5 w-5 cursor-pointer rounded-md border-2 border-slate-300 bg-white text-emerald-600 shadow-sm accent-emerald-600 transition hover:border-emerald-400 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Select all payments" checked={filteredRows.length > 0 && selectedRows.length === filteredRows.length} onChange={selectAll} />}</th><th className="p-4">Jobcard</th><th className="p-4">{activeTab === "paid" ? "Date paid" : "Date confirmed"}</th><th className="p-4">Group Name</th><th className="p-4">Voucher / Status</th><th className="p-4">Driver</th><th className="p-4">Bank / Account</th><th className="p-4 text-right">Amount</th><th className="p-4">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={9} className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-600" /></td></tr> : filteredRows.length === 0 ? <tr><td colSpan={9} className="p-10 text-center text-slate-500">{dateFrom || dateTo ? "No payments match the selected dates." : activeTab === "paid" ? "No paid payments found." : "No payments are waiting for bank upload confirmation."}</td></tr> : filteredRows.map((row) => <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-amber-50/50"><td className="p-4">{activeTab === "upload" && <input type="checkbox" className="h-5 w-5 cursor-pointer rounded-md border-2 border-slate-300 bg-white text-emerald-600 shadow-sm accent-emerald-600 transition hover:border-emerald-400 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} aria-label={`Select ${row.voucher.number} ${row.stage}`} />}</td><td className="p-4 font-semibold"><button type="button" className="text-blue-700 hover:underline" onClick={() => setViewJobCard(row.voucher.jobCardId)}>{row.voucher.jobCardNo || "—"}</button></td><td className="p-4 whitespace-nowrap text-slate-600">{dateOnly(activeTab === "paid" ? row.paidAt : row.exportedAt)}</td><td className="p-4 font-medium text-slate-900">{row.voucher.groupName || "—"}</td><td className="p-4">{row.voucher.number}<div className="text-xs capitalize text-slate-500">{row.stage}</div><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.status === "paid" ? "bg-emerald-50 text-emerald-700" : row.status === "exported" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{row.status === "paid" ? "Paid" : row.status === "exported" ? "Uploaded to bank" : "Ready for upload"}</span></td><td className="p-4">{row.voucher.driverName}</td><td className="p-4 text-xs">{row.voucher.bankName || "—"}<br />{row.voucher.bankAccountNumber || "—"}</td><td className="p-4 text-right font-semibold">{money(row.amount)} TZS</td><td className="p-4"><div className="flex flex-wrap gap-2">{activeTab === "upload" && canManage && row.status !== "paid" && <button type="button" onClick={() => openEditModal(row)} disabled={processing} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>}{activeTab === "upload" && canManage && row.status === "exported" && <button type="button" onClick={() => openPaidModal([row])} disabled={processing} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Mark paid</button>}</div></td></tr>)}</tbody></table></div>
    {paidSelection && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Mark bank batch paid"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Mark batch as paid</h2><p className="mt-1 text-sm text-slate-500">{paidSelection.length} payment{paidSelection.length === 1 ? "" : "s"} · {money(paidSelection.reduce((sum, row) => sum + Number(row.amount), 0))} TZS</p></div><button type="button" onClick={() => setPaidSelection(null)} disabled={processing} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close batch payment"><X className="h-5 w-5" /></button></div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Confirm the bank has processed these uploaded payments before marking them paid.</p>{error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="mt-5 space-y-4"><label className="block text-sm font-medium text-slate-700">Payment reference (optional)<input value={reference} maxLength={90} onChange={(event) => setReference(event.target.value)} placeholder="Bank transaction or batch reference" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" /></label><label className="block text-sm font-medium text-slate-700">Payment proof (optional)<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setProof(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPaidSelection(null)} disabled={processing} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">Cancel</button><button type="button" onClick={markBatchPaid} disabled={processing} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{processing ? "Saving..." : "Confirm paid"}</button></div></div></div>}
    {editPayment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Edit payment record"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Edit payment record</h2><p className="mt-1 text-sm text-slate-500">{editPayment.voucher.number} · {editPayment.stage}</p></div><button type="button" onClick={() => setEditPayment(null)} disabled={processing} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close edit payment"><X className="h-5 w-5" /></button></div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Only unpaid records can be edited.</p>{error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="mt-5 space-y-4"><label className="block text-sm font-medium text-slate-700">Amount<input type="number" min="0.01" step="0.01" required value={editAmount} onChange={(event) => setEditAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Payment reference<input value={editReference} maxLength={100} onChange={(event) => setEditReference(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></label><label className="block text-sm font-medium text-slate-700">Reason<textarea rows="3" maxLength={1000} value={editReason} onChange={(event) => setEditReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditPayment(null)} disabled={processing} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium">Cancel</button><button type="button" onClick={saveEdit} disabled={processing || !editAmount} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{processing ? "Saving..." : "Save changes"}</button></div></div></div>}
    {viewJobCard && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Full job card view" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewJobCard(null); }}><div className="relative h-[96vh] w-full max-w-[1500px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"><button type="button" onClick={() => setViewJobCard(null)} className="absolute right-4 top-4 z-10 rounded-lg border border-red-700 bg-red-600 p-2 text-white shadow-sm transition hover:bg-red-700" aria-label="Close job card details"><X className="h-5 w-5" /></button><iframe title="Full job card details" src={`/job-cards?view=${encodeURIComponent(viewJobCard)}&embed=1`} className="h-full w-full border-0" /></div></div>}
  </div>;
}
