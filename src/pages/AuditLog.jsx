import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { apiFetch } from "../utils/api";

const ACTION_STYLES = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "25" });
      if (action) params.set("action", action);
      const response = await apiFetch(`/audit-logs?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Unable to load audit logs.");
      setLogs(data.data || []);
      setMeta(data);
    } catch (err) {
      setError(err.message || "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [action]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
          <p className="text-sm text-slate-500">Track system creates, edits, and deletes.</p>
        </div>
        <button onClick={() => loadLogs(meta.current_page)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ClipboardList className="text-slate-400" size={20} />
        <select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All actions</option>
          <option value="CREATE">Creates</option>
          <option value="UPDATE">Edits</option>
          <option value="DELETE">Deletes</option>
        </select>
        <span className="text-sm text-slate-500">{meta.total || 0} records</span>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Details</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">IP</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Loading…</td></tr> : logs.length === 0 ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No audit records found.</td></tr> : logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><div className="font-medium text-slate-700">{log.user?.name || "Unknown"}</div><div className="text-xs text-slate-400">{log.user?.email || ""}</div></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${ACTION_STYLES[log.action] || "bg-slate-100 text-slate-600"}`}>{log.action}</span></td>
                <td className="max-w-xl px-4 py-3 text-xs text-slate-600"><div className="font-semibold text-slate-700">{log.action === "CREATE" ? "Created record" : log.action === "UPDATE" ? "Edited record" : "Deleted record"}</div><div className="mt-1 break-words text-slate-500">{JSON.stringify({ ...(log.route_parameters || {}), ...(log.request_data || {}) }) || "No additional details recorded"}</div></td>
                <td className="px-4 py-3 text-slate-600">{log.status_code}</td>
                <td className="px-4 py-3 text-slate-500">{log.ip_address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta.last_page > 1 && <div className="flex items-center justify-between text-sm text-slate-500"><button disabled={meta.current_page <= 1} onClick={() => loadLogs(meta.current_page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {meta.current_page} of {meta.last_page}</span><button disabled={meta.current_page >= meta.last_page} onClick={() => loadLogs(meta.current_page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div>}
    </div>
  );
}
