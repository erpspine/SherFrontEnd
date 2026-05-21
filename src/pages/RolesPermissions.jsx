import { useEffect, useState } from "react";
import { Shield, Key, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "../utils/api";

const roleStyles = {
  Admin: "bg-blue-50 text-blue-600 border-blue-200",
  Operations: "bg-purple-50 text-purple-600 border-purple-200",
  Finance: "bg-amber-50 text-amber-600 border-amber-200",
  Driver: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Viewer: "bg-cyan-50 text-cyan-600 border-cyan-200",
};

const defaultRoleStyle = "bg-slate-50 text-slate-600 border-slate-200";

function groupPermissions(permissions) {
  return permissions.reduce((groups, perm) => {
    const [module] = perm.split(".");
    if (!groups[module]) groups[module] = [];
    groups[module].push(perm);
    return groups;
  }, {});
}

function formatModuleName(module) {
  return module.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toTitleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActionName(perm) {
  const parts = perm.split(".");
  const action = parts.slice(1).join(" ").replace(/[_-]+/g, " ").trim();
  return toTitleCase(action || "Access");
}

function formatPermissionLabel(perm) {
  const [module] = perm.split(".");
  return `${formatModuleName(module)} - ${formatActionName(perm)}`;
}

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiFetch("/roles/permissions");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to fetch roles and permissions.",
        );
      }

      setRoles(payload.roles ?? []);
      setAllPermissions(payload.permissions ?? []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load roles and permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const permissionGroups = groupPermissions(allPermissions);
  const groupNames = Object.keys(permissionGroups).sort();

  const permSet = roles.reduce((map, role) => {
    map[role.name] = new Set(role.permissions);
    return map;
  }, {});

  const totalPerms = allPermissions.length;
  const totalRoles = roles.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Roles &amp; Permissions
          </h1>
          <p className="text-slate-500 mt-1">
            View which permissions are assigned to each system role.
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-slate-500 text-sm">Total Roles</p>
          <p className="text-2xl font-bold mt-1 text-slate-800">{totalRoles}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-slate-500 text-sm">Total Permissions</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">{totalPerms}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-slate-500 text-sm">Permission Groups</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">
            {groupNames.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-slate-500 text-sm">Admin Permissions</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">
            {permSet["Admin"]?.size ?? "—"}
          </p>
        </div>
      </div>

      {/* Role badges */}
      {!isLoading && roles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            System Roles
          </p>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role.name}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${roleStyles[role.name] ?? defaultRoleStyle}`}
              >
                <Shield className="w-3.5 h-3.5" />
                {role.name}
                <span className="opacity-60 text-xs">
                  ({role.permissions.length})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Permissions matrix */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 shadow-sm">
          Loading roles and permissions...
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center text-slate-400 shadow-sm">
          No data available.
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head-gradient">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wide w-56 min-w-[14rem]">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Permission
                    </div>
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.name}
                      className="py-4 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleStyles[role.name] ?? defaultRoleStyle}`}
                      >
                        <Shield className="w-3 h-3" />
                        {role.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupNames.map((module) => (
                  <>
                    {/* Group header row */}
                    <tr key={`group-${module}`} className="bg-slate-50">
                      <td
                        colSpan={roles.length + 1}
                        className="py-2 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200"
                      >
                        {formatModuleName(module)}
                      </td>
                    </tr>

                    {/* Permission rows */}
                    {permissionGroups[module].map((perm) => (
                      <tr
                        key={perm}
                        className="border-b border-slate-100 hover:bg-amber-50/60 transition-colors"
                      >
                        <td className="py-3 px-6">
                          <div className="text-sm text-slate-700 font-medium">
                            {formatPermissionLabel(perm)}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {perm}
                          </div>
                        </td>
                        {roles.map((role) => {
                          const hasPermission = permSet[role.name]?.has(perm);
                          return (
                            <td
                              key={role.name}
                              className="py-3 px-4 text-center"
                            >
                              {hasPermission ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
