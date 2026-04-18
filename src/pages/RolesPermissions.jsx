import { useEffect, useState } from "react";
import { Shield, Key, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "../utils/api";

const roleStyles = {
  Admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Operations: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Finance: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Driver: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Viewer: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const defaultRoleStyle = "bg-slate-500/20 text-slate-400 border-slate-500/30";

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

function formatActionName(perm) {
  const parts = perm.split(".");
  return parts.slice(1).join(".").replace(/_/g, " ");
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
          <h1 className="text-2xl font-bold text-white">
            Roles &amp; Permissions
          </h1>
          <p className="text-slate-400 mt-1">
            View which permissions are assigned to each system role.
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Total Roles</p>
          <p className="text-2xl font-bold mt-1 text-white">{totalRoles}</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Total Permissions</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{totalPerms}</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Permission Groups</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">
            {groupNames.length}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Admin Permissions</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">
            {permSet["Admin"]?.size ?? "—"}
          </p>
        </div>
      </div>

      {/* Role badges */}
      {!isLoading && roles.length > 0 && (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
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
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl py-20 text-center text-slate-500">
          Loading roles and permissions...
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl py-20 text-center text-slate-500">
          No data available.
        </div>
      ) : (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-400 w-56 min-w-[14rem]">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Permission
                    </div>
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.name}
                      className="py-4 px-4 text-center text-sm font-semibold"
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
                    <tr key={`group-${module}`} className="bg-slate-800/30">
                      <td
                        colSpan={roles.length + 1}
                        className="py-2 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        {formatModuleName(module)}
                      </td>
                    </tr>

                    {/* Permission rows */}
                    {permissionGroups[module].map((perm) => (
                      <tr
                        key={perm}
                        className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="py-3 px-6">
                          <span className="text-sm text-slate-300 font-mono">
                            {perm}
                          </span>
                          <span className="ml-2 text-xs text-slate-600 capitalize">
                            {formatActionName(perm)}
                          </span>
                        </td>
                        {roles.map((role) => {
                          const hasPermission = permSet[role.name]?.has(perm);
                          return (
                            <td
                              key={role.name}
                              className="py-3 px-4 text-center"
                            >
                              {hasPermission ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-slate-700 mx-auto" />
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
        </div>
      )}
    </div>
  );
}
