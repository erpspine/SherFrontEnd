import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Loader2, Search } from "lucide-react";
import { apiFetch } from "../utils/api";

export default function PerDiems() {
  const [params, setParams] = useSearchParams();
  const jobCardId = params.get("jobCardId");
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiFetch(`/per-diems${jobCardId ? `?jobCardId=${encodeURIComponent(jobCardId)}` : ""}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load per diems.");
        if (!controller.signal.aborted) setVouchers(data.perDiems || []);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [jobCardId, reload]);

  const filtered = useMemo(() => vouchers.filter((voucher) =>
    [voucher.number, voucher.jobCardNo, voucher.driverName, voucher.groupName, voucher.preparedBy]
      .some((value) => String(value || "").toLowerCase().includes(search.trim().toLowerCase())),
  ), [vouchers, search]);

  const download = async (voucher) => {
    setDownloading(voucher.id);
    setError("");
    try {
      const response = await apiFetch(`/per-diems/${voucher.id}/pdf`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to download voucher.");
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
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Per Diems</h1>
          <p className="text-sm text-slate-500 mt-1">Driver guide allowance vouchers. Each assigned driver has one voucher per jobcard.</p>
        </div>
        <Link to="/job-cards" className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium">Job Cards</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input aria-label="Search per diems" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search voucher, jobcard, driver or group..."
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-800 bg-white" />
        </div>
        {jobCardId && <button onClick={() => setParams({})} className="text-sm text-amber-700 underline">Show all per diems</button>}
        <button onClick={() => setReload((value) => value + 1)} disabled={loading} className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50">Refresh</button>
      </div>
      {error && <div role="alert" className="p-3 rounded-lg bg-red-50 text-red-700">{error}</div>}
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-sm text-left text-slate-700">
          <thead className="bg-slate-50 text-slate-600"><tr>
            {["Voucher No.", "Jobcard", "Generated", "Driver", "Group", "Safari Dates", "Total Amount", "Prepared By", "PDF"].map((label) => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="p-8 text-center">Loading per diems...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-slate-500">{search ? "No matching per diems." : "No per diems found. Use Per Diem on a jobcard to create a voucher."}</td></tr>
                : filtered.map((voucher) => <tr key={voucher.id} className="border-t border-slate-100 hover:bg-amber-50/50">
                  <td className="p-3 font-medium whitespace-nowrap">{voucher.number}</td>
                  <td className="p-3 whitespace-nowrap">{voucher.jobCardNo || "—"}</td>
                  <td className="p-3 whitespace-nowrap">{new Date(voucher.generatedAt).toLocaleDateString("en-GB")}</td>
                  <td className="p-3">{voucher.driverName}</td>
                  <td className="p-3">{voucher.groupName || "—"}</td>
                  <td className="p-3 whitespace-nowrap">{voucher.safariStartDate || "—"}<br />{voucher.safariEndDate || "—"}</td>
                  <td className="p-3 text-right whitespace-nowrap">{Number(voucher.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-3">{voucher.preparedBy}</td>
                  <td className="p-3"><button onClick={() => download(voucher)} disabled={downloading !== null}
                    title={`Download ${voucher.number}`} aria-label={`Download ${voucher.number}`}
                    className="p-2 rounded-lg text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                    {downloading === voucher.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </button></td>
                </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && <p className="text-sm text-slate-500">{filtered.length} voucher{filtered.length === 1 ? "" : "s"}</p>}
    </div>
  );
}
