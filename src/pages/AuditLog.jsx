import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ClipboardList, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
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
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "25" });
      if (action) params.set("action", action);
      if (userId) params.set("user_id", userId);
      if (search.trim()) params.set("search", search.trim());
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

  useEffect(() => {
    const timeout = window.setTimeout(() => loadLogs(), 300);
    return () => window.clearTimeout(timeout);
  }, [action, search, userId]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await apiFetch("/users");
        const data = await response.json();
        if (response.ok) setUsers(data.users || []);
      } catch {
        // The audit log remains usable if the optional user list cannot be loaded.
      }
    };

    loadUsers();
  }, []);

  const clearFilters = () => {
    setSearch("");
    setAction("");
    setUserId("");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sher-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sher-gold-dark">
            <ShieldAlert size={14} /> System activity
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500">Review every create, edit, and delete across your workspace.</p>
        </div>
        <button onClick={() => loadLogs(meta.current_page)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sher-gold/50 hover:bg-sher-gold/5">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total records</span><ClipboardList className="text-sher-gold" size={19} /></div><p className="mt-2 text-2xl font-bold text-slate-800">{meta.total || 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Creates & edits</span><Activity className="text-blue-600" size={19} /></div><p className="mt-2 text-2xl font-bold text-slate-800">{logs.filter((log) => log.action !== "DELETE").length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current view</span><CheckCircle2 className="text-emerald-600" size={19} /></div><p className="mt-2 text-2xl font-bold text-slate-800">{logs.length} <span className="text-sm font-medium text-slate-400">shown</span></p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users, routes, IP addresses, actions, or details…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-700 outline-none transition focus:border-sher-gold focus:bg-white focus:ring-2 focus:ring-sher-gold/20" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={17} /></button>}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <select value={userId} onChange={(event) => setUserId(event.target.value)} className="max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-sher-gold focus:ring-2 focus:ring-sher-gold/20">
              <option value="">All users</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.email ? ` · ${user.email}` : ""}</option>)}
            </select>
            <select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-sher-gold focus:ring-2 focus:ring-sher-gold/20">
              <option value="">All actions</option><option value="CREATE">Creates</option><option value="UPDATE">Edits</option><option value="DELETE">Deletes</option>
            </select>
            {(search || action || userId) && <button type="button" onClick={clearFilters} className="text-sm font-medium text-slate-500 hover:text-slate-800">Clear filters</button>}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Search is applied across the activity details and user information.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-800">Activity history</h2><p className="mt-0.5 text-xs text-slate-400">Newest events appear first</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">{loading ? "Updating…" : `${logs.length} on this page`}</span></div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head-gradient border-b text-xs uppercase tracking-wider text-slate-500">
            <tr><th className="px-5 py-3.5">Date</th><th className="px-5 py-3.5">User</th><th className="px-5 py-3.5">Action</th><th className="px-5 py-3.5">Details</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">IP address</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Loading…</td></tr> : logs.length === 0 ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No audit records found.</td></tr> : logs.map((log) => (
              <tr key={log.id} className="transition hover:bg-amber-50/40">
                <td className="whitespace-nowrap px-5 py-4 text-slate-600"><div>{new Date(log.created_at).toLocaleDateString()}</div><div className="mt-0.5 text-xs text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></td>
                <td className="px-5 py-4"><div className="font-medium text-slate-700">{log.user?.name || "Unknown"}</div><div className="mt-0.5 text-xs text-slate-400">{log.user?.email || "System activity"}</div></td>
                <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_STYLES[log.action] || "bg-slate-100 text-slate-600"}`}>{log.action}</span><div className="mt-1 text-xs text-slate-400">{log.method} {log.path}</div></td>
                <td className="max-w-xl px-5 py-4 text-xs text-slate-600"><div className="font-semibold text-slate-700">{log.action === "CREATE" ? "Created record" : log.action === "UPDATE" ? "Edited record" : "Deleted record"}</div><div className="mt-1 break-words text-slate-500">{JSON.stringify({ ...(log.route_parameters || {}), ...(log.request_data || {}) }) || "No additional details recorded"}</div></td>
                <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${Number(log.status_code) >= 400 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{log.status_code}</span></td>
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{log.ip_address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      {meta.last_page > 1 && <div className="flex items-center justify-between text-sm text-slate-500"><button disabled={meta.current_page <= 1} onClick={() => loadLogs(meta.current_page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {meta.current_page} of {meta.last_page}</span><button disabled={meta.current_page >= meta.last_page} onClick={() => loadLogs(meta.current_page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div>}
    </div>
  );
}
